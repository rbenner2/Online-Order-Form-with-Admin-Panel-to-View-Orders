const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const {check, validationResult} = require('express-validator');
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/final8020', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const Order = mongoose.model('Order',{
    name: String,
    phone: String,
    strawberryJuices: Number,
    watermelonJuices: Number,
    orangeJuices: Number
} );

const Admin = mongoose.model('Admin', {
    uname: String,
    pass: String
});

var myApp = express();

//---------------- Do not modify anything above this --------------------------
myApp.use(express.urlencoded({extended:false}));

// set up session
myApp.use(session({
    secret: 'superrandomsecret',
    resave: false,
    saveUninitialized: true
}));



myApp.set('views', path.join(__dirname, 'views'));
myApp.use(express.static(__dirname+'/public'));
myApp.set('view engine', 'ejs');


//------------- Use this space only for your routes ---------------------------


//home page
myApp.get('/', function(req, res){
    res.render('form'); // no need to add .ejs to the file name
});

//defining regular expressions
var phoneRegex = /^[0-9]{3}\-[0-9]{3}\-[0-9]{4}$/;

//function to check a value using regular expression
function checkRegex(userInput, regex){
    if(regex.test(userInput)){
        return true;
    }
    else{
        return false;
    }
}

// Custom phone validation function
function customPhoneValidation(value){
    if(!checkRegex(value, phoneRegex)){
        throw new Error('Phone should be in the format xxx-xxx-xxxx');
    }
    return true;
}

myApp.post('/', [
    check('name', 'Must have a name').not().isEmpty(),
    check('phone').custom(customPhoneValidation),
    check('strawberryJuices', 'Must enter a valid quantity').isInt( {min: 1}).optional({ nullable: true, checkFalsy: true }),
    check('watermelonJuices', 'Must enter a valid quantity').isInt( {min: 1}).optional({ nullable: true, checkFalsy: true }),
    check('orangeJuices', 'Must enter a valid quantity').isInt( {min: 1}).optional({ nullable: true, checkFalsy: true }),
    //purchase at least one item
    check('quantity').custom((val, { req, loc, path }) => {
        const item2 = req.body.strawberryJuices
        const item1 = req.body.watermelonJuices
        const item3 = req.body.orangeJuices
        if (!(item1 >= 1 | item2 >= 1 | item3 >= 1)) {
            throw new Error("Purchase at least 1 item to checkout");
        } else {
            return true;
        }
    })
    
],function(req, res){

    const errors = validationResult(req);
    if (!errors.isEmpty()){
        //console.log(errors); // check what is the structure of errors
        res.render('form', {
            errors:errors.array()
        });
    }
    else{
        var name = req.body.name;
        var phone = req.body.phone;
        var strawberryJuices = req.body.strawberryJuices;
        var watermelonJuices = req.body.watermelonJuices;
        var orangeJuices = req.body.orangeJuices;
        var item1Price = 3.89;
        var item2Price = 2.99;
        var item3Price = 4.79;
        var item1Total = item1Price * strawberryJuices;
        var item2Total = item2Price * watermelonJuices;
        var item3Total = item3Price * orangeJuices;
        var subTotal = item1Total + item2Total + item3Total;
        var tax = 0.13;

        
         //items
        let items = [];
        if (req.body.strawberryJuices >= 1) {
            items.push(`${req.body.strawberryJuices} x Strawberry Juices = $${item1Total}`);
        }
        if (req.body.watermelonJuices >= 1) {
            items.push(`${req.body.watermelonJuices} x Watermelon Juices = $${item2Total}`);
        }
        if (req.body.orangeJuices >= 1) {
            items.push(`${req.body.orangeJuices} x Orange Juices = $${item3Total}`);
        }

        var total = subTotal + tax ;
        
        
        var pageData = {
            name : name,
            phone : phone, 
            strawberryJuices : strawberryJuices,
            watermelonJuices : watermelonJuices,
            orangeJuices : orangeJuices,
            items : items,
            subTotal : subTotal,
            tax : tax,
            total : total
        }

        //store data to DB
        var newOrder = new Order({
            name: name,
            phone : phone,
            strawberryJuices: strawberryJuices,
            watermelonJuices: watermelonJuices,
            orangeJuices: orangeJuices
        })
        // create an object for the model Order
        // save the order
        newOrder.save().then(function(){
            console.log('New order created');
        });
        // display receipt
        res.render('form', pageData);
    }
});

//allorders page
myApp.get('/allorders', function (req, res) {
    // use this to display all the orders when a user is logged in as admin
    if (req.session.userLoggedIn) {
      Order.find({}).exec(function (err, orders) {
        if (err) {
          console.log(err);
          res.render('message', { message: 'Error occured.' });
        }
  
        // modification of collection not allowed. So creating new list with calculated values
        const ordersList = [];
        for (var order of orders) {
          var subTotal = order.strawberryJuices * 3.89;
          subTotal += order.watermelonJuices * 2.99;
          subTotal += order.orangeJuices * 4.79;
          var tax = subTotal * 0.13;
          var total = tax + subTotal;
          var tempOrder = {
            _id: order._id,
            name: order.name,
            phone: order.phone,
            strawberryJuices: order.strawberryJuices,
            watermelonJuices: order.watermelonJuices,
            orangeJuices: order.orangeJuices,
            subTotal: subTotal,
            tax: tax,
            total: total,
          };
          ordersList.push(tempOrder);
        }
        res.render('allorders', { orders: ordersList });
      });
    } else {
      res.redirect('/login');
    }
  });

// login page
myApp.get('/login', function(req, res){
    res.render('login');
});

// login form post
myApp.post('/login', function(req, res){
    var uname = req.body.uname;
    var pass = req.body.pass;

    //console.log(username);
    //console.log(password);

    Admin.findOne({uname: uname, pass: pass}).exec(function(err, admin){
        // log any errors
        console.log('Error: ' + err);
        console.log('Admin: ' + admin);
        if(admin){
            //store username in session and set logged in true
            req.session.uname = admin.uname;
            req.session.userLoggedIn = true;
            // redirect to the dashboard
            res.redirect('/allorders');
        }
        else{
            res.render('login', {error: 'Sorry, cannot login!'});
        }
        
    });

});

myApp.get('/logout', function(req, res){
    req.session.uname = '';
    req.session.userLoggedIn = false;
    res.render('login', {error: 'Successfully logged out'});
});

myApp.get('/delete/:orderid', function(req, res){
    // check if the user is logged in
    if(req.session.userLoggedIn){
        //delete
        var orderid = req.params.orderid;
        console.log(orderid);
        Order.findByIdAndDelete({_id: orderid}).exec(function(err, order){
            console.log('Error: ' + err);
            console.log('Order: ' + order);
            if(order){
                res.render('delete', {message: 'Successfully deleted!'});
            }
            else{
                res.render('delete', {message: 'Sorry, could not delete!'});
            }
        });
    }
    else{
        res.redirect('/login');
    }
});






//---------------- Do not modify anything below this --------------------------
//------------------------ Setup the database ---------------------------------

myApp.get('/setup',function(req, res){
    
    let adminData = [{
        'uname': 'admin',
        'pass': 'admin'
    }];
    
    Admin.collection.insertMany(adminData);

    var firstNames = ['John ', 'Alana ', 'Jane ', 'Will ', 'Tom ', 'Leon ', 'Jack ', 'Kris ', 'Lenny ', 'Lucas '];
    var lastNames = ['May', 'Riley','Rees', 'Smith', 'Walker', 'Allen', 'Hill', 'Byrne', 'Murray', 'Perry'];

    let ordersData = [];

    for(i = 0; i < 10; i++){
        let tempName = firstNames[Math.floor((Math.random() * 10))] + lastNames[Math.floor((Math.random() * 10))];
        let tempOrder = {
            name: tempName,
            phone: Math.floor((Math.random() * 10000000000)),
            strawberryJuices: Math.floor((Math.random() * 10)),
            watermelonJuices: Math.floor((Math.random() * 10)),
            orangeJuices: Math.floor((Math.random() * 10))
        };
        ordersData.push(tempOrder);
    }
    
    Order.collection.insertMany(ordersData);
    res.send('Database setup complete. You can now proceed with your exam.');
    
});

//----------- Start the server -------------------

myApp.listen(8080);
console.log('Server started at 8080 for mywebsite...');