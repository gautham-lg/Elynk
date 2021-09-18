require('dotenv').config()
const express = require("express");
const ejs = require("ejs");
const bcrypt = require("bcryptjs");
const cookieParser = require('cookie-parser')
const validator = require('validator');
const bodyParser = require("body-parser");
const Customer = require('./server/userdb');
const Advertisement = require('./server/advertisement');
const Company = require('./server/category');
const Agent = require('./server/agent');
const CustomerOrder = require('./server/orderstatus');
const Request = require('./server/incidents');
const Type = require('./server/brands');
const Employee = require('./server/member');
const CompanyProducts = require('./server/products');
const mails = require('./server/email');
const session = require('express-session');
const CorsMW = require('./server/cors');
const url = require('url');
const helmet = require("helmet");
const MongoStore = require('connect-mongo')(session);
// const redis = require('redis');
// const connectRedis = require('connect-redis');

const database = "Database"

const durl='mongodb+srv://'+ process.env.MONGO_DB +'@elynk.ij6ld.mongodb.net/'+database

const mongoose=require('mongoose')
mongoose.connect(durl)



const app = express();

// app.use((req, res, next) => {
//   res.header('Access-Control-Allow-Origin', '*');
//   next();
// });
// const RedisStore = connectRedis(session);
//app.set('trust proxy', true);
// app.enable('trust proxy')
// app.use(cookieParser())
//app.options("*", CorsMW);
//app.use(CorsMW);
// app.use(
//   helmet({
//     contentSecurityPolicy: false,
//   })
// );

// const redisClient = redis.createClient({
//     port: 6379,
//     host: 'localhost'
// });

app.use(session({
  name:"qid",
  //store : new session.MemoryStore({ reapInterval: 60000 * 10 }),
  //store: new RedisStore({ client: redisClient }),
  store: new MongoStore({ mongooseConnection: mongoose.connection }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  // cookie: { httpOnly:true,sameSite: 'none',secure: true,maxAge: 10800000 }
  cookie: {secure: false,maxAge: 10800000 }
}))
// secure should be modified in prod

//console.log(process.env.SECURE_EMAIL);

app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended:true}))
app.use(bodyParser.json())
app.set('view engine' ,'ejs')


app.get("/",async function(req,res){
  var ads = await Advertisement.Ad.find({}).exec();
  res.render("index",{ads:ads});
})

app.get("/login-page", function(req,res){
  res.render("login",{error:false});
})

app.get("/register-page", function(req,res){
  res.render("register",{error:false});
})

// Registering of user
app.post("/signup",async function(req,res){
  var username = req.body.username;
  var usermobilenumber = req.body.usermobilenumber;
  var useremail = req.body.useremail;
  var userpassword = req.body.userpassword;
  var userpasswordretry = req.body.userpasswordretry;
  var userdob = req.body.userdob;
  var usergender = req.body.usergender;
  var useraddress = req.body.useraddress;
  var usercity = req.body.usercity;
  var userpincode = req.body.userpincode;
  var userstate = req.body.userstate;
  var data = [username,usermobilenumber,useremail,useraddress,usercity,userpincode,userstate,userdob];

try{

if(!username.includes("=") && validator.isMobilePhone(usermobilenumber) && validator.isNumeric(userpincode) ){

      // Password Encryption
      const encrypted = await bcrypt.hash(userpassword,8)
      // Verification for passwords and state
      if (userpassword === userpasswordretry && userstate !== "Select" && encrypted.length > 0 && !userpassword.includes("=") ){

        var isavailable = await Customer.User.find({email : useremail}).exec();

      // Checking if the user is already available
        if(isavailable.length > 0){

          res.render("login",{status : 'warning'})

        }else{

          const userData = new Customer.User({
            name : username,
            phonenumber : usermobilenumber,
            email : useremail,
            password : encrypted,
            dateofbirth : userdob,
            gender : usergender,
            address : useraddress,
            city : usercity,
            pincode : userpincode,
            state : userstate,
            status : "Active",
            userotp : "",
            usercart : []

            })


            // Saving the user
            var result = await userData.save()
            res.render("login",{status : 'success'})
            // Send email notification to user
            var subject = 'Elynk Stores - Registration Successful';
            var body = '<h1>Elynk</h1><p>We welcome you onboard to experience the new Shopping trend. Elynk provides a vide variety of products all at your finger tips where you can quickly order and get exciting discounts.</p>'+'<p>You can visit the <b>My Orders</b> Section to find all your orders.</p> <p>Also, Please feel free to reach out to the <b>Support</b> Section to have all your queries addressed.</p>  ' +'<p>Kindly use <b>'+result._id+'</b> as your Reference ID for any future communications.</p><br><br><p>Team Elynk Stores</p><p>123456789</p>'
           await mails.mailer(useremail,"",subject,body);

        }

      }else{
        console.log("Failure at criteria");
        res.render("register",{error:true,error_reason : " Kindly Verify both the Passwords or State or DOB",data : data});
      }


}else{

  res.render("register",{error:true,error_reason : " Invalid value provided as input.",data : data});

}


}catch(e){
  // Undefined error in database
  console.log("/signup "+ e);
  res.render("register",{error:true,error_reason : " Unhandled Error. Kindly try again later",data : data});

}


})

// Login request of the user
app.post("/signin", async function(req,res){


try{

  var useremail = req.body.useremail;
  var userpassword = req.body.userpassword;


  var isavailable = await Customer.User.find({email : useremail}).exec();
  if(isavailable.length > 0){
  var matched = await bcrypt.compare(userpassword, isavailable[0].password)

  if(matched){
    var ads = await Advertisement.Ad.find({}).exec();
    req.session.email = isavailable[0].email;
    req.session.name = isavailable[0].name;
    req.session.cartcount = isavailable[0].usercart.length;
    res.render("index",{ads:ads,login:true,name:isavailable[0].name,cartcount:req.session.cartcount});

  }else{
    res.render("login",{status : 'error'})
  }
  }else{
    res.render("login",{status : 'error'})
  }

}catch(e){
  console.log("/signin "+ e);
  res.render("login",{status : 'error'});
}

});

app.get("/home",async function(req,res){

try{

if(req.session.email){


      var isavailable = await Customer.User.find({email : req.session.email}).exec();
      if(isavailable.length > 0){
      var matched = true

      if(matched){
        var ads = await Advertisement.Ad.find({}).exec();
        req.session.email = isavailable[0].email;
        req.session.name = isavailable[0].name;
        req.session.cartcount = isavailable[0].usercart.length;
        res.render("index",{ads:ads,login:true,name:isavailable[0].name,cartcount:req.session.cartcount});
  }else{
    res.render("login",{error:false});
  }
}else{
    res.render("login",{error:false});
  }

}else{
  res.render("login",{error:false});
}

} catch(e){
  console.log("/home "+ e);
  res.render("login",{error:false});
}


});

app.get("/forgot-password",function(req,res){
res.render("login",{forgotpassword : 'onlyemail'})
});

app.post("/recover-email",async function(req,res){
try{
  // res.sendFile(__dirname+"/loader.html");
  var useremail = req.body.useremail;
  var isavailable = await Customer.User.find({email : useremail}).exec();
  if(isavailable.length > 0){
    var otp = Math.floor(100000 + Math.random() * 900000);

    var subject = 'OTP Verification - Elynk';
    var body = '<h1>Elynk</h1><br><p>We observe that you have forgot your password. Please use the OTP - <b>'+ otp +'</b> to resubmit your password.</p><br><br><p>Team Elynk Stores</p><p>123456789</p>'
    await mails.mailer(useremail,"",subject,body);
    otp =  await bcrypt.hash(otp+"",8)
    await Customer.User.findByIdAndUpdate(isavailable[0]._id, { userotp: otp,otptime : Date.now() })
    res.render("login",{forgotpassword : 'emailandconfirmpassword', email : useremail })
  }else{
    res.render("login",{status : 'error'});
  }

}catch(e){
  console.log("/recover-email "+ e);
  res.render("login",{error:false});
}

});

app.post("/verify-otp", async function(req,res){
try{
  var useremail = req.body.useremail;
  var userotp = req.body.userotp;
  var isavailable = await Customer.User.find({email : useremail}).exec();
  if (isavailable.length > 0){
    if( await bcrypt.compare(userotp, isavailable[0].userotp) && Date.now() - isavailable[0].otptime <=900000 ){
      res.render("login",{forgotpassword : 'updatepassword', email : useremail })
    }else{
      res.render("login",{status : 'error'});
    }
  }else{

  }
}catch(e){
console.log("/verify-otp "+ e);
res.render("login",{status : 'error'});
}
});

app.post("/update-password",async function(req,res){
try{
  var useremail = req.body.useremail;
  var userpassword = req.body.userpassword;
  var retryuserpassword = req.body.retryuserpassword;
  var isavailable = await Customer.User.find({email : useremail}).exec();

  if(isavailable.length > 0 && userpassword === retryuserpassword && !userpassword.includes("=")){
  userpassword = await bcrypt.hash(userpassword,8)
  await Customer.User.findByIdAndUpdate(isavailable[0]._id, { password : userpassword })
  res.render("login",{status : 'success'})
  }else{
  res.render("login",{status : 'error'});
  }

}catch(e){
  console.log("/update-password "+ e);
  res.render("login",{status : 'error'});
}
});

app.get("/logout",function(req,res){
try{
  req.session.destroy(function(err) {
  if(err){
    res.render("login",{error:false});
  }else{
    res.render("login",{error:false});
  }

  })
}catch(e){
  console.log("/logout "+ e);
  res.render("login",{status : 'error'});
}
});

app.get("/partnerlogout",function(req,res){

req.session.destroy(function(err) {
if(err){
  res.render("member-login",{error:false});
}else{
  res.render("member-login",{error:false});
}

})

});

app.get("/adminlogout",function(req,res){

req.session.destroy(function(err) {
if(err){
  res.render("admin-login",{error:false});
}else{
  res.render("admin-login",{error:false});
}

})

});

app.get("/category",async function(req,res){
try{

  if(req.session.email){

    var category = await Company.Category.find({}).exec();
    if (category){
    res.render("category",{category : category,login:true,name:req.session.name,cartcount:req.session.cartcount})

    }else{
        console.log("error");
      }
  }else{
    res.render("login",{error:false});
  }

}catch(e){
  console.log("/category "+ e);
  res.render("login",{error:false});
}

});

app.post("/brands",async function(req,res){
var newbrands = []
try{
if(req.session.email){
var category = await Company.Category.find({type:req.body.submit}).exec();
var brands = await Type.Brand.find({}).exec();
brands.forEach((value)=>{
if (value.category.includes(req.body.submit)){
  newbrands.push(value)
}
})

if(newbrands){

if(category){

res.render("brands",{category:category,brands:newbrands,login:true,name:req.session.name,cartcount:req.session.cartcount})
}else{
res.render("brands",{brands:newbrands,login:true,name:req.session.name,cartcount:req.session.cartcount})
}

}else{

}
}else{
res.render("login",{error:false});
}
}catch(e){
  console.log("/brands "+ e);
  res.render("login",{error:false});
}

});

app.post("/products",async function(req,res){

try{




if(req.session.email){

if(req.body.option){

if(req.body.addtocart === "True"){

var userproductid = req.body.productidtext
var productquantity = req.body.productquantity
var productoption = req.body.option
var productname = req.body.nameid

const usercartinfo = {
  proid : userproductid,
  name : productname,
  option : productoption,
  quantity : productquantity
}

var isavailable = await Customer.User.find({email : req.session.email}).exec();
if(isavailable){

isavailable[0].usercart.push(JSON.stringify(usercartinfo));
// isavailable[0].usercart.push(JSON.parse(usercartinfo));
await Customer.User.findByIdAndUpdate(isavailable[0]._id, { usercart: isavailable[0].usercart})
req.session.cartcount++;
var brands = await Type.Brand.find({name :req.body.brandname }).exec();
var products = await CompanyProducts.Product.find({parentcompany:req.body.brandname}).exec();



// res.render("products",{products:products,login:true,cartcount:req.session.cartcount,name:req.session.name,option:req.body.option,productid : req.body.brandid,branddetails : brands,added : "Success"})
res.render("products",{products:products,login:true,cartcount:req.session.cartcount,name:req.session.name,productid : req.body.brandid,branddetails : brands,added : "Success"})


}else{
  res.render("login",{error:false});
}


}else{

  var brands = await Type.Brand.find({name :req.body.brandname }).exec();
  var products = await CompanyProducts.Product.find({parentcompany:req.body.brandname}).exec();
  res.render("products",{products:products,login:true,cartcount:req.session.cartcount,name:req.session.name,option:req.body.option,productid : req.body.brandid,branddetails : brands})

}


}else{

var brandname = req.body.submit;
if(req.body.allproducts === "all"){



}else{
var brands = await Type.Brand.find({name :req.body.submit }).exec();

var products = await CompanyProducts.Product.find({parentcompany:req.body.submit}).exec();


if(products){
  res.render("products",{products:products,login:true,name:req.session.name,cartcount:req.session.cartcount,branddetails : brands})
}else{
  res.render("login",{error:false});
}


}
}
}else{
  res.render("login",{error:false});
}

}catch(e){

  console.log("/products"+ e);
  res.render("login",{error:false});

}

});

app.post("/allproducts",async function(req,res){

try{




if(req.session.email){

if(req.body.option){

if(req.body.addtocart === "True"){

var userproductid = req.body.productidtext
var productquantity = req.body.productquantity
var productoption = req.body.option
var productname = req.body.nameid

const usercartinfo = {
  proid : userproductid,
  name : productname,
  option : productoption,
  quantity : productquantity
}

var isavailable = await Customer.User.find({email : req.session.email}).exec();
if(isavailable){

isavailable[0].usercart.push(JSON.stringify(usercartinfo));
// isavailable[0].usercart.push(JSON.parse(usercartinfo));
await Customer.User.findByIdAndUpdate(isavailable[0]._id, { usercart: isavailable[0].usercart})
req.session.cartcount++;

var products = await CompanyProducts.Product.find({producttype:req.body.producttype}).exec();

// res.render("allproducts",{products:products,login:true,cartcount:req.session.cartcount,name:req.session.name,option:req.body.option,productid : req.body.brandid,added : "Success"})
res.render("allproducts",{products:products,login:true,cartcount:req.session.cartcount,name:req.session.name,productid : req.body.brandid,added : "Success"})


}else{
  res.render("login",{error:false});
}


}else{


  var products = await CompanyProducts.Product.find({producttype:req.body.producttype}).exec();

  res.render("allproducts",{products:products,login:true,cartcount:req.session.cartcount,name:req.session.name,option:req.body.option,productid : req.body.brandid})

}


}else{

var brandname = req.body.submit;
if(req.body.allproducts){

var products = await CompanyProducts.Product.find({producttype:req.body.allproducts}).exec();

if(products){
  res.render("allproducts",{products:products,login:true,name:req.session.name,cartcount:req.session.cartcount})
}else{
  res.render("login",{error:false});
}


}
}
}else{
  res.render("login",{error:false});
}

}catch(e){

  console.log("/allproducts"+ e);
  res.render("login",{error:false});

}

});

app.post("/productdetail",async function(req,res){

try{
  if(req.session.email){

  if(req.body.prodid){

  if(req.body.option){

  if(req.body.addtocart === "True"){

    var userproductid = req.body.prodid
    var productquantity = req.body.productquantity
    var productoption = req.body.option
    var productname = req.body.nameid

    const usercartinfo = {
      proid : userproductid,
      name : productname,
      option : productoption,
      quantity : productquantity
    }



    var isavailable = await Customer.User.find({email : req.session.email}).exec();
    if(isavailable){

    isavailable[0].usercart.push(JSON.stringify(usercartinfo));
    // isavailable[0].usercart.push(JSON.parse(usercartinfo));
    await Customer.User.findByIdAndUpdate(isavailable[0]._id, { usercart: isavailable[0].usercart})
    req.session.cartcount++;

    var products = await CompanyProducts.Product.findById(req.body.prodid).exec();
    var brands = await Type.Brand.find({name :products.parentcompany}).exec();
    res.render("productdetail",{products:products,brands:brands,login:true,cartcount:req.session.cartcount,name:req.session.name,type:req.body.option,added : "Success"})


    }else{
      res.render("login",{error:false});
    }

  }else{

    var products = await CompanyProducts.Product.findById(req.body.prodid).exec();
    var brands = await Type.Brand.find({name :products.parentcompany}).exec();
    res.render("productdetail",{products:products,brands:brands,login:true,name:req.session.name,cartcount:req.session.cartcount,type:req.body.option})
}

  }else{


var products = await CompanyProducts.Product.findById(req.body.prodid).exec();
var brands = await Type.Brand.find({name :products.parentcompany}).exec();
res.render("productdetail",{products:products,brands:brands,login:true,name:req.session.name,cartcount:req.session.cartcount})
}

  }else{
    res.render("login",{error:false});
  }


  }else{
    res.render("login",{error:false});
  }

}catch(e){
  console.log("/productdetail" + e);
  res.render("login",{error:false});
}
});



app.get("/cartvalue",async function(req,res){
try{
var cartvalue = []
var optiontype = []

if(req.session.email){
var isavailable = await Customer.User.find({email : req.session.email}).exec();
if(isavailable[0].usercart.length > 0){

// console.log(isavailable[0].usercart);
//console.log(JSON.parse(JSON.stringify(isavailable[0].usercart)));
for (const value of JSON.parse(JSON.stringify(isavailable[0].usercart))){
cartvalue.push((JSON.parse(value)));
}
// console.log(cartvalue);
for(const pro of cartvalue){
var product = await CompanyProducts.Product.findById(pro.proid)
var i = -1
product.alltypes.forEach((value)=>{
i++
if(pro.option == i){
pro.option = value
pro.optionnumber = i
pro.price = product.allprice[i]
}
})
}
res.render("cart",{cartvalue : cartvalue,login:true,name:req.session.name,cartcount:req.session.cartcount})
}else{
res.render("cart",{cartvalue : "False",login:true,name:req.session.name,cartcount:req.session.cartcount})
}

}else{
res.render("login",{error:false});
}
}catch(e){
console.log("/cartvalue",e);
}
});





app.post("/cartvalidation",async function(req,res){
try{
var cartvalue = []
if(req.session.email){

var isavailable = await Customer.User.find({email : req.session.email}).exec();
if(isavailable){
var i = -1;
isavailable[0].usercart.forEach((value)=>{
// console.log(JSON.parse(value));
i++
if(req.body.removeitemid == JSON.parse(value).proid && req.body.optionnumber == JSON.parse(value).option ){
isavailable[0].usercart.splice(i,1)
req.session.cartcount = req.session.cartcount - 1;
}
})

await Customer.User.findByIdAndUpdate(isavailable[0]._id, { usercart: isavailable[0].usercart})

for (const value of JSON.parse(JSON.stringify(isavailable[0].usercart))){
cartvalue.push((JSON.parse(value)));
}

for(const pro of cartvalue){
var product = await CompanyProducts.Product.findById(pro.proid)
var j = -1
product.alltypes.forEach((value)=>{
j++
if(pro.option == j){
pro.option = value
pro.optionnumber = j
pro.price = product.allprice[j]
}
})
}
res.render("cart",{cartvalue : cartvalue,login:true,name:req.session.name,cartcount:req.session.cartcount})

}else{
res.render("login",{error:false});
}
}else{
res.render("login",{error:false});
}
}catch(e){
console.log("/cartvalidation ",e);
}
})


app.post("/checkout",async function(req,res){
try{
if(req.session.email){
  var userorder = []
  var present = false ;
  var isavailable = await Customer.User.find({email : req.session.email}).exec();
  if(isavailable){

  if(req.body.paymentmode){
    // console.log(req.body.checkoutname);
    // console.log(req.body.checkoutaddress);
    // console.log(req.body.checkoutpincode);
    //
    var fee = ""
    var deliverypartner = await Agent.Partner.find({}).exec();
    if(deliverypartner.length > 0){

    deliverypartner.forEach((value)=>{
     var deliveryfee = value.servicetax
      // console.log(deliveryfee);
      value.workpincode.forEach((code)=>{
      if(code === req.body.checkoutpincode){
        present = true
        fee =  deliveryfee
        // console.log("pincode");
        // console.log(code);
        // console.log(req.body.checkoutpincode);
      }
      })
    })
    if(present){
      var updateorder = await CustomerOrder.Order.findByIdAndUpdate(req.body.paymentmode,{orderbyname : req.body.checkoutname,userphonenumber : req.body.checkoutphonenumber,orderaddress :req.body.checkoutaddress , orderpincode : req.body.checkoutpincode, orderstate : req.body.checkoutstate })
      if(updateorder){
        // console.log(updateorder);
        res.render("checkoutform",{fee : fee,totalprice : updateorder.orderprice,paymentform : true,orderid :req.body.paymentmode,login:true,name:req.session.name,cartcount:req.session.cartcount})
      }else{
        // console.log(updateorder);
        res.render("checkoutform",{paymentform : false,pin : req.body.checkoutpincode ,orderid :req.body.paymentmode,login:true,name:req.session.name,cartcount:req.session.cartcount})
      }
    }else{
      res.render("checkoutform",{paymentform : false, pin : req.body.checkoutpincode ,orderid :req.body.paymentmode,login:true,name:req.session.name,cartcount:req.session.cartcount})
    }

    }else{
      res.render("checkoutform",{paymentform : false,orderid :req.body.paymentmode,login:true,name:req.session.name,cartcount:req.session.cartcount})
    }
  }else{
    var userdata = {
    name : isavailable[0].name,
    email :isavailable[0].email,
    phonenumber : isavailable[0].phonenumber,
    address : isavailable[0].address,
    pincode : isavailable[0].pincode,
    state : isavailable[0].state
    }
    userorder.push(userdata)

    var orderproducts = []
    // console.log(req.body);

    // console.log(typeof(req.body.productquantities));

    if(typeof(req.body.productquantities) == "string"){
        var usercartinfo = {
          prodid : req.body.productids,
          name : req.body.productnames,
          type : req.body.productoptions,
          quantity : req.body.productquantities
        }
        orderproducts.push(usercartinfo)
    }else{
      for (var i = 0; i < req.body.productoptions.length; i++) {
        var usercartinfo = {
          prodid : req.body.productids[i],
          name : req.body.productnames[i],
          type : req.body.productoptions[i],
          quantity : req.body.productquantities[i]
        }
        // console.log(req.body.productids[i]);
        orderproducts.push(usercartinfo)

      }

    }

    // console.log("babai");
    // console.log(orderproducts);
    // console.log("tuchuk");
    const orderdata = new CustomerOrder.Order ({
      orderitems :  orderproducts,
      orderbyemail:req.session.email,
      orderbyname:isavailable[0].name,
      orderstatus:"WAITING",
      ordertime:null,
      orderstatustime:null,
      deliverytime :null ,
      deliveryperson :"",
      orderprice : req.body.productorderprice,
      orderaddress :isavailable[0].address,
      orderpincode :isavailable[0].pincode,
      orderstate : isavailable[0].state,
      orderpriority :"",
      userfeedback : "",
      userphonenumber : isavailable[0].phonenumber,
      orderconfirmed :0,
      modeofpayment : "",
      orderissue : "",
      issuecomments :""
      })

      var orderresult = await orderdata.save();

      // console.log(orderresult._id);

      res.render("checkoutform",{order : userorder,orderid :orderresult._id,login:true,name:req.session.name,cartcount:req.session.cartcount})


  }
}
}else{
res.render("login",{error:false});
}
}catch(e){
  console.log("/checkout" , e);
}
});

app.post("/payment", async function(req,res){
try{
if(req.session.email){
var updateorder = await CustomerOrder.Order.findByIdAndUpdate(req.body.orderid,{ orderprice : req.body.ordertotalprice ,modeofpayment : req.body.mode ,ordertime : Date().toLocaleString(),orderstatustime : Date().toLocaleString() , deliverytime : Date().toLocaleString() , orderstatus : "PENDING",profits : req.body.profits })
if(updateorder){
var isavailable = await Customer.User.find({email : req.session.email}).exec();
isavailable[0].usercart = []
await Customer.User.findByIdAndUpdate(isavailable[0]._id, { usercart:isavailable[0].usercart  })
req.session.cartcount = 0
res.render("status",{status:true,message : "ok",trackid : updateorder._id ,login:true,name:req.session.name,cartcount:req.session.cartcount})
// console.log(JSON.parse(JSON.stringify(updateorder.orderitems)))
var tabletext = ""
var emailorder = JSON.parse(JSON.stringify(updateorder.orderitems));
emailorder.forEach((data)=>{
// console.log(data[0].name);
tabletext = tabletext.concat("<li>"+data[0].name+" - "+data[0].quantity+" qty(s) - "+ data[0].type  +"</li>")

})

// console.log(updateorder.orderprice);
// console.log(req.body.ordertotalprice);

//Sending cart email
var subject = 'Elynk Order Shipment';
var body = '<h1>Elynk</h1><br><p>Thank you for placing your order at <b>Elynk Stores Online</b>.</p><br>'+'<p>The following below are the details of your latest order :</p><br><ul>'+tabletext+'</ul><br>'  + '<p><b>Total : </b><b><font color='+"green"+' >'+ req.body.ordertotalprice +' INR </font></b></p><p>Please use <b>'+ updateorder._id +'</b> as a reference for future communications / knowing any queries with respect to the order placed above.</p> <p>Alternately, you can find the order status at <b>My Orders Section</b> in the site .</p><font color='+"red"+' ><b>Note : You can cancel the order anytime only before the delivery executive accepts it.</b></font><p></p><br><br><p>Team Elynk Stores</p><p>123456789</p>'
await mails.mailer(req.session.email,"",subject,body);

}else{
res.render("status",{success:false,message : "no",login:true,name:req.session.name,cartcount:req.session.cartcount})
}
} else{
res.render("login",{error:false});
}
}catch(e){
console.log("/payment ", e);
res.render("login",{error:false});
}
})

app.get("/myorders",async function(req,res){
try{
if(req.session.email){
var myorders = await CustomerOrder.Order.find({orderbyemail : req.session.email }).exec();
if(myorders){
  res.render("myorders",{orders : myorders,login:true,name:req.session.name,cartcount:req.session.cartcount})
}else{
  res.render("myorders",{orders:false,login:true,name:req.session.name,cartcount:req.session.cartcount})
}
}else{
res.render("login",{error:false});
}
}catch(e){
console.log("/myorders ", e);
}
});

app.post("/cancelorder", async function(req,res){
try{
if(req.session.email){
var updateorder = await CustomerOrder.Order.findByIdAndUpdate(req.body.cancel,{orderstatustime : Date().toLocaleString() , orderstatus : "Cancelled by Customer",orderconfirmed : "9",deliveryperson : "" })
res.redirect("/myorders")
}else{
res.render("login",{error:false});
}
}catch(e){
console.log("/cancelorder ", e);
}
});

app.post("/search", async function(req,res){
try{
if(req.session.email){
var companymatch = ""
var showproducts = []
var pureproducts = []
var allproducts = []
var value = req.body.items.split(" ");
var products = await CompanyProducts.Product.find({}).exec();
if(products){
products.forEach((item)=>{

value.forEach((name)=>{

if(item.parentcompany.includes(name)){
var productitem = true
companymatch = item.parentcompany;
if(item.name.replace(companymatch,"").toUpperCase().includes(name.toUpperCase())){
showproducts.push(item)
}else{
  item.productcategory.forEach((ele)=>{
  if(ele.toUpperCase() === name.toUpperCase() && productitem){
  showproducts.push(item)
  productitem = false
  }
  })

}



}
else{
  var productitem = true


  if(item.name.replace(item.parentcompany,"").toUpperCase().includes(name.toUpperCase())){
  allproducts.push(item)
}
 else if(item.nametype.replace(item.parentcompany,"").toUpperCase().includes(name.toUpperCase())){
  allproducts.push(item)
  }
   else if(item.parentcompany.replace(item.parentcompany,"").toUpperCase().includes(name.toUpperCase())){
   allproducts.push(item)
   }
   else{
     item.productcategory.forEach((ele)=>{
     if(ele.toUpperCase() === name.toUpperCase() && productitem){
     allproducts.push(item)
     productitem = false
     }
     })
   }

}

})
})

var productsData = pureproducts.concat(allproducts)
if(productsData.length > 0){
  res.render("allproducts",{products:productsData,login:true,name:req.session.name,cartcount:req.session.cartcount,search : "False"})
}else{
  res.render("allproducts",{products:products,login:true,name:req.session.name,cartcount:req.session.cartcount,search : "False"})
}

}else{
console.log("No Products");
res.render("login",{error:false});
}

} else{
res.render("login",{error:false});
}
}catch(e){
console.log("/search " , e);
}
});

app.get("/brands/:value", async function(req,res){
// console.log(req.params.value);
try{
if(req.session.email){
var products = await CompanyProducts.Product.find({parentcompany : req.params.value}).exec();
var brands = await Type.Brand.find({name :req.params.value }).exec();
if(products && brands){
res.render("products",{products:products,login:true,name:req.session.name,cartcount:req.session.cartcount,branddetails : brands,search : "False"})
}else{
res.render("login",{error:false});
}
}else{
res.render("login",{error:false});
}
}catch(e){
console.log("/brands/:value " , e);
}
});

app.get("/category/:value", async function(req,res){
// console.log(req.params.value);
try{
if(req.session.email){
newbrands = []
var category = await Company.Category.find({type:req.params.value}).exec();
var brands = await Type.Brand.find({}).exec();

if(brands && category){
brands.forEach((value)=>{
value.category.forEach((item)=>{
if(item.toUpperCase() === req.params.value.toUpperCase()){
newbrands.push(value)
}
})
})
res.render("brands",{category:category,brands:newbrands,login:true,name:req.session.name,cartcount:req.session.cartcount})
  }else{
res.render("login",{error:false});
}
}else{
res.render("login",{error:false});
}
}catch(e){
console.log("/brands/:value " , e);
}
});

app.post("/emailquery", async function(req,res){
try{
if(req.session.email){

  const incdata = new Request.Incident({

    IncType :"General",
    Incby:req.session.email,
    description : req.body.Message,
    priority : "p4",
    createdTime : Date().toLocaleString() ,
    resolutionTime : "",
    status :"Initiated",
    resolution :"",
    comments :"",
    IncOn : "General"
  })

    // Saving the user
var result = await incdata.save()

var subject = 'Elynk Incident - Query';
var body = '<h1>Elynk</h1><p>User -'+ req.body.Name +' </p>'+ '<p>Email -  <b>'+req.body.Email+'</b></p><br><p>Incident : '+ result._id +'</p> <br><p>Message : '+ req.body.Message+' </p><p>Please take a note of this incident and resolve this ASAP. Please inform the user once the issue is resolved.</p>'
await mails.mailer(process.env.SECURE_EMAIL,"",subject,body);
res.render("status",{success:true,message : "Thank you for your concern. We shall get back to you shortly" ,login:true,name:req.session.name,cartcount:req.session.cartcount})
} else{
res.render("login",{error:false});
}
}catch(e){
console.log("/emailquery " , e);
}
});

app.post("/helporder",async function(req,res){
try{
if(req.session.email){

  var incdata = new Request.Incident({

    IncType :"Order Item",
    Incby:req.session.email,
    description : req.body.help,
    priority : "p2",
    createdTime : Date().toLocaleString() ,
    resolutionTime : "",
    status :"Initiated",
    resolution :"",
    comments :"",
    IncOn : req.body.orderid
  })

    // Saving the user
var result = await incdata.save()
res.render("status",{success:true,message : "Thank you for your concern. Please note the support request - "+result._id+". We shall get back shortly " ,login:true,name:req.session.name,cartcount:req.session.cartcount})

var subject = 'Elynk Incident - Order Item';
var body = '<h1>Elynk</h1><p>User -'+ "N/A" +' </p>'+ '<p>Email -  <b>'+req.session.email+'</b></p><br><p>Incident Number : '+ result._id +'</p> <br><p>Message : '+ ' Customer Phone Support on Order ID - '+ req.body.orderid +' </p><p>Please take a note of this incident and resolve this ASAP. Please inform the user once the issue is resolved.</p>'
await mails.mailer(process.env.SECURE_EMAIL,"",subject,body);


} else{
res.render("login",{error:false});
}
}catch(e){
console.log("/helporder ", e );
res.render("login",{error:false});
}
});

app.get("/partner/home", function(req,res){
res.render("partner-home")
});

app.get("/partner/login", function(req,res){
res.render("member-login")
});

app.get("/partner/register", function(req,res){
res.render("member-register")
});

app.post("/partner-signup", async function(req,res){
  var code = []
  var username = req.body.partnername;
  var usermobilenumber = req.body.partnerphonenumber;
  var useremail = req.body.partneremail;
  var userpassword = req.body.partnerpassword;
  var userpasswordretry = req.body.partnerpasswordretry;
  var userdob = req.body.partnerdob;
  var usergender = req.body.partnergender;
  var useraddress = req.body.partneraddress;
  var usercity = req.body.partnercity;
  var userpincode = req.body.partnerpincode;
  var userstate = req.body.partnerstate;
  var userservicetax = req.body.partnerservicetax;
  var partnerstatus = "PENDING"
  var partnerdocs = ""
  var data = [username,usermobilenumber,useremail,usergender,useraddress,usercity,userpincode,userservicetax,userstate,userdob];


  try{

      // Password Encryption
      const partencrypted = await bcrypt.hash(userpassword,8)
      // Verification for passwords and state
      if (userpassword === userpasswordretry && userstate !== "Select" && partencrypted.length > 0 ){

        var isavailable = await Agent.Partner.find({email : useremail}).exec();

      // Checking if the user is already available
        if(isavailable.length > 0){

          res.render("member-login",{status : 'warning'})

        }else{

          userpincode = userpincode.split(",")

          userpincode.forEach((value)=>{
          if(value.length > 0 && parseInt(value) > 0){
          code.push(value)
          }
          })

          // console.log(code);

          const partnerData = new Agent.Partner({
            name : username,
            phonenumber : usermobilenumber,
            email : useremail,
            password : partencrypted,
            dateofbirth : userdob,
            gender : usergender,
            address : useraddress,
            city : usercity,
            workpincode : code,
            state : userstate,
            rating: "2.5",
            servicetax : userservicetax,
            agentphoto : "",
            status : partnerstatus,
            partnerdocs : partnerdocs
            })


            // Saving the user
            var result = await partnerData.save()
            res.render("member-login",{status : 'success'})
            // Send email notification to user
            var subject = 'Elynk Shopping - Successful Registration';
            var body = '<h1>Elynk</h1><p>Thank you for being a partner at Elynk Stores Online.</p>'+ '<p>Please use <b>'+result._id+'</b> for future communications.</p><br>'
           await mails.mailer(useremail,"",subject,body);

        }

      }else{
        console.log("Failure at criteria");
        res.render("member-register",{error:true,error_reason : " Kindly Verify both the Passwords or State or DOB",data : data});
      }


  }catch(e){
    // Undefined error in database
    console.log("Failure" , e);
    res.render("member-register",{error:true,error_reason : " Unhandled Error. Kindly try again later",data : data});

  }

});

app.post("/partner-signin", async function(req,res){

try{
  var orders = []
  var useremail = req.body.useremail;
  var userpassword = req.body.userpassword;

  var isavailable = await Agent.Partner.find({email : useremail}).exec();
  if(isavailable.length > 0){
  var matched = await bcrypt.compare(userpassword, isavailable[0].password)


  if(matched && isavailable[0].status === "APPROVED" ){

    req.session.partneremail = isavailable[0].email;
    req.session.partnername = isavailable[0].name;


    var myorders = await CustomerOrder.Order.find({}).exec();
    myorders.forEach((code)=>{
    isavailable[0].workpincode.forEach((value)=>{
    if(value === code.orderpincode && parseInt(code.orderpincode) > 0 && parseInt(code.orderconfirmed) == 0){
    orders.push(code)
    }
    })
    if(code.deliveryperson == req.session.partneremail && code.orderstatus !=="DELIVERED"){
    orders.push(code)
    }
    })


    res.render("partner",{orders:orders,name:isavailable[0].name});

  }else{
    res.render("member-login",{status : 'error'})
  }
  }else{
    res.render("member-login",{status : 'error'})
  }

}catch(e){
  console.log("Failure " , e);
  res.render("member-login",{status : 'error'});
}

});

app.post("/statuschange",async function(req,res){

try{

if(req.session.partneremail){

  var orders = []

  if(req.body.orderid){
  var orderstatustime = Date.toLocaleString();
  var deliveryperson = req.session.partneremail;
  var orderstatus = req.body.status
  if(req.body.status === "ACCEPT"){
  var orderstatusnumber = 1
}else if(req.body.status === "PICKED"){
  var orderstatusnumber = 2
} else if(req.body.status === "ISSUE"){
  var orderstatusnumber = 8
} else if(req.body.status === "REJECT") {
  var orderstatusnumber = 0
  deliveryperson = ""
  orderstatus = "PENDING"

}else{
  var orderstatusnumber = 3
}
  var oneorder = await CustomerOrder.Order.findByIdAndUpdate(req.body.orderid, {orderconfirmed :orderstatusnumber, orderstatus : orderstatus , orderstatustime : orderstatustime , deliveryperson : deliveryperson })
  }

  var isavailable = await Agent.Partner.find({email : req.session.partneremail}).exec();
  var myorders = await CustomerOrder.Order.find({}).exec();
  myorders.forEach((code)=>{
  isavailable[0].workpincode.forEach((value)=>{
  if(value === code.orderpincode && parseInt(code.orderpincode) > 0 && parseInt(code.orderconfirmed) == 0  ){
  orders.push(code)

  }
  })
  if(code.deliveryperson == req.session.partneremail && code.orderstatus !=="DELIVERED"){
  orders.push(code)

  }
  })
  res.render("partner",{orders:orders,name:isavailable[0].name});


}else{
res.render("member-login",{status : 'error'})
}

}catch(e){
  console.log("/statuschange ", e);
}

})

app.get("/admin", function(req,res){
res.render("admin")
});

app.get("/admin/login",function(req,res){
res.render("admin-login")
});

app.get("/admin/register",function(req,res){
res.render("admin-register")
});

app.post("/admin-signup",async function(req,res){

  var username = req.body.username;
  var usermobilenumber = req.body.usermobilenumber;
  var useremail = req.body.useremail;
  var userpassword = req.body.userpassword;
  var userpasswordretry = req.body.userpasswordretry;
  var userdob = req.body.userdob;
  var usergender = req.body.usergender;
  var useraddress = req.body.useraddress;
  var usercity = req.body.usercity;
  var userpincode = req.body.userpincode;
  var userstate = req.body.userstate;
  var data = [username,usermobilenumber,useremail,useraddress,usercity,userpincode,userstate,userdob];

try{


    // Password Encryption
    const memberencrypted = await bcrypt.hash(userpassword,8)
    // Verification for passwords and state
    if (userpassword === userpasswordretry && userstate !== "Select" && memberencrypted.length > 0 ){

      var isavailable = await Employee.Member.find({email : useremail}).exec();

    // Checking if the user is already available
      if(isavailable.length > 0){

        res.render("admin-login",{status : 'warning'})

      }else{
        const memberdata = new Employee.Member({

          name :username,

          phonenumber:usermobilenumber,

          email :useremail ,

          password : memberencrypted,

          dateofbirth :userdob ,

          gender : usergender,

          address : useraddress,

          city : usercity,

          pincode :userpincode,

          state : userstate,
          role : "ADMIN",
          userotp :"",
          otptime :""
          })
        //
        //   memberdata.save();


          // Saving the user
          var result = await memberdata.save()
          res.render("admin-login",{status : 'success'})
          // Send email notification to user
          var subject = 'Elynk Shopping - Successful Registration';
          var body = '<h1>Elynk</h1><p>Welcome to Elynk Stores Online as Admin.</p>'+ '<p>Please use <b>'+result._id+'</b> for future communications.</p><br>'
         await mails.mailer(useremail,"",subject,body);

      }

    }else{
      console.log("Failure at criteria");
      res.render("admin-register",{error:true,error_reason : " Kindly Verify both the Passwords or State or DOB",data : data});
    }


}catch(e){
  // Undefined error in database
  console.log("Failure");
  res.render("admin-register",{error:true,error_reason : " Unhandled Error. Kindly try again later",data : data});

}


});

app.post("/admin-signin", async function(req,res){


try{

  var useremail = req.body.useremail;
  var userpassword = req.body.userpassword;


  var isavailable = await Employee.Member.find({email : useremail}).exec();
  if(isavailable.length > 0){
  var matched = await bcrypt.compare(userpassword, isavailable[0].password)

  if(matched){

    req.session.adminemail = isavailable[0].email;
    req.session.adminname = isavailable[0].name;
    res.redirect("/admin-home");


    // res.render("admin-home",{login:true,name:isavailable[0].name});

  }else{
    res.render("admin-login",{status : 'error'})
  }
  }else{
    res.render("admin-login",{status : 'error'})
  }

}catch(e){
  console.log("Failure ", e);
  res.render("admin-login",{status : 'error'});
}

});

app.get("/admin-home",async function(req,res){
try{
if(req.session.adminemail){

var products = await CompanyProducts.Product.find({}).exec();
var users = await Customer.User.find({}).exec();
var brands = await Type.Brand.find({}).exec();
var orders = await CustomerOrder.Order.find({}).exec();
var incidents = await Request.Incident.find({}).exec();

res.render("admin-home",{products:products, users : users,brands : brands,orders : orders,incidents : incidents,name :req.session.adminname});

}else{
res.render("admin-login",{error:false});
}
}catch(e){
console.log("/admin-home ", e);
res.render("admin-login",{status : 'error'});
}
});

app.post("/updateincident",async function(req,res){
try{

if(req.body.pending){
var incidents = await Request.Incident.findByIdAndUpdate(req.body.pending,{status : "PENDING", comments : req.body.comments})
res.redirect("/admin-home");
}else if(req.body.resolve){
  var incidents = await Request.Incident.findByIdAndUpdate(req.body.resolve,{status : "CLOSED", comments : req.body.comments,resolution : "Issue Resolved", resolutionTime : Date.toLocaleString()})
  res.redirect("/admin-home");
}else{
console.log("error");
}

} catch(e){
console.log("/updateincident ", e);
res.render("admin-login",{status : 'error'});
}
});

app.post("/createticket", async function(req,res){
try{
if(req.session.adminemail){

  const incdata = new Request.Incident({

    IncType :req.body.type,
    Incby:req.session.adminemail,
    description : req.body.description,
    priority : req.body.critical,
    createdTime : Date().toLocaleString() ,
    resolutionTime : "",
    status :"INITIATED",
    resolution :"",
    comments :"",
    IncOn : req.body.incon
  })

    // Saving the user
var result = await incdata.save()

var subject = 'Elynk Incident - Query';
var body = '<h1>Elynk</h1><p>User -'+ req.session.adminname +' </p>'+ '<p>Email -  <b>'+req.session.adminemail+'</b></p><br><p>Incident : '+ result._id +'</p> <br><p>Message : '+ req.body.description+' </p><p>Please take a note of this incident and resolve this ASAP. Please inform the user once the issue is resolved.</p>'
await mails.mailer(process.env.SECURE_EMAIL,"",subject,body);
res.redirect("/admin-home");
} else{
res.render("admin-login",{error:false});
}
}catch(e){
console.log("/createticket " , e);
}
});

app.get("/partner-management", async function(req,res){
try{
  if(req.session.adminname){
  var deliverypartner = await Agent.Partner.find({}).exec();
  if(deliverypartner){
  res.render("partnermanagement",{partner:deliverypartner,name :req.session.adminname});
  }else{
  res.render("partnermanagement",{partner:"error",name :req.session.adminname});
  }
}else{
res.render("admin-login",{error:false});
}
}catch(e){
  console.log("/partner-management ", e);
}
});

app.post("/approvepartner",async function(req,res){
try{
if(req.session.adminemail){
var deliverypartner = await Agent.Partner.findByIdAndUpdate(req.body.approve,{status : "APPROVED", servicetax : req.body.servicetax})
res.redirect("/partner-management");
} else{
res.render("admin-login",{error:false});
}
}catch(e){
console.log("/approvepartner ", e);
res.render("admin-login",{error:false});
}
});

app.get("/brand-management", async function(req,res){
try{
if(req.session.adminemail){
var brands = await Type.Brand.find({}).exec();
var category = await Company.Category.find({}).exec();
if(brands && category){
res.render("adminbrandmanagement",{brands:brands,category : category,name :req.session.adminname});
}else{
res.render("adminbrandmanagement",{brands:"error",name :req.session.adminname});
}
}else{
res.render("admin-login",{error:false});
}
}catch(e){
  console.log("/brand-management ", e);
  res.render("admin-login",{error:false});
}
});

app.post("/createbrand", async function(req,res){
  try{
  if(req.session.adminemail){
  var name = req.body.brandname;
  var email = req.body.brandemail;
  var type = req.body.brandtype
  var description = req.body.branddescription
  var brandlogo = req.body.brandlogo
  var adsbanner = req.body.brandadsbannerlogo
  var madein = req.body.brandmadein
  var contact = req.body.brandcontactnumber
  var address = req.body.brandofficeaddress

  if(typeof(req.body.brandtype) == "string"){
  var brandtype = []
  brandtype.push(req.body.brandtype)

  var brandsdata = new Type.Brand({

    name : name,

    email:email,
    password:"",
    otp:"",

    otptime :Date.now(),

    description : description,
    isoffer :"",
    brandlogo :brandlogo,
    rating : "",
    adbannerimage :adsbanner,
    madein : madein,
    category : brandtype,
    categorylogo :"",
    phonenumber :contact,
    headoffice : address

    })


    var result = await brandsdata.save();

  }else{
    var brandsdata = new Type.Brand({

      name : name,

      email:email,
      password:"",
      otp:"",

      otptime :Date.now(),

      description : description,
      isoffer :"",
      brandlogo :brandlogo,
      rating : "",
      adbannerimage :adsbanner,
      madein : madein,
      category : type,
      categorylogo :"",
      phonenumber :contact,
      headoffice : address

      })


      var result = await brandsdata.save();


  }

  res.redirect("/brand-management");


  }else{
  res.render("admin-login",{error:false});
  }
  }catch(e){
    console.log("/createbrand ", e);
    res.render("admin-login",{error:false});
  }
});

app.post("/brandedit",async function(req,res){
try{
if(req.session.adminemail){

if(req.body.update){

var updatebrand = await Type.Brand.findByIdAndUpdate(req.body.update, { name : req.body.newname , description : req.body.newdescription , brandlogo : req.body.newbrandlogo , adbannerimage : req.body.newbannerad  })

}else{

var deletebrand = await Type.Brand.findByIdAndRemove(req.body.delete)

}

res.redirect("/brand-management");


} else{
res.render("admin-login",{error:false});
}
}catch(e){
console.log("/brandedit ",e);
res.render("admin-login",{error:false});
}
});


app.get("/order-management", async function(req,res){
try{
if(req.session.adminemail){
var orders = await CustomerOrder.Order.find({}).exec();
if(orders){
res.render("adminordermanagement",{orders:orders,name :req.session.adminname});
}else{
res.render("adminordermanagement",{orders:orders,name :req.session.adminname});
}
}else{
res.render("admin-login",{error:false});
}
}catch(e){
  console.log("/order-management ", e);
  res.render("admin-login",{error:false});
}
});

app.post("/modify-order", async function(req,res){
try{
if(req.session.adminemail){

if(req.body.updateorder){
if(parseInt(req.body.statuscode) === 0 || req.body.statusvalue.toUpperCase() == "PENDING" ){
  req.session.partneremail = null
  var updateorder = await CustomerOrder.Order.findByIdAndUpdate(req.body.updateorder,{ orderconfirmed : parseInt(req.body.statuscode) , orderstatus : req.body.statusvalue.toUpperCase() , deliveryperson : ""})
}else{
  var updateorder = await CustomerOrder.Order.findByIdAndUpdate(req.body.updateorder,{ orderconfirmed : parseInt(req.body.statuscode) , orderstatus : req.body.statusvalue.toUpperCase() })
}
}else if(req.body.updateorder){

}else{
res.render("admin-login",{error:false});
}
res.redirect("/order-management");
}else{
res.render("admin-login",{error:false});
}
}catch(e){
  console.log("/modify-management ", e);
  res.render("admin-login",{error:false});
}
});

app.get("/product-management", async function(req,res){
try{
if(req.session.adminemail){

var products = await CompanyProducts.Product.find({}).exec();
var brands = await Type.Brand.find({}).exec();
var category = await Company.Category.find({}).exec();
res.render("productmanagement",{products:products,brands : brands,category : category,name :req.session.adminname});
}else{
res.render("admin-login",{error:false});
}
} catch(e){
console.log("/product-management ", e);
res.render("admin-login",{error:false});
}
});

app.post("/createproduct", async function(req,res){
try{
var allimagearray = []
var allcategoryarray = []
var allpricearray = []
var procatarray = []

if(req.session.adminemail){

if(req.body.delete){

var deleteproduct = await CompanyProducts.Product.findByIdAndRemove(req.body.delete)

}else{

var name = req.body.name
var allimages = req.body.allimages
var allcategory = req.body.allcategory
var allprice = req.body.allprice
var procat = req.body.procat
var description = req.body.description
var mainimage = req.body.mainimage
var category = req.body.category
var company = req.body.company

allimagearray = allimages.split(",")
procatarray = procat.split(",")
allcategoryarray = allcategory.split(",")
allpricearray = allprice.split(",")



const brandsdata = new CompanyProducts.Product({

  name : name,

  email:"",

  description :description,
  isoffer : "",
  productimage : mainimage,
  allimages:allimagearray,
  rating : "",
  madein : "",
  instock:"Yes",
  statuspresent :"",
  alltypes: allcategoryarray,
  allprice: allpricearray,
  parentcompany : company,
  producttype : category,
  productcategory : procatarray,
  nametype : "",
  productvideo : ""
  })

var result = await brandsdata.save();

}

res.redirect("/product-management");



} else{
res.render("admin-login",{error:false});
}
}catch(e){
  console.log("/createproduct ", e);
  res.render("admin-login",{error:false});
}
});

app.get("/adsmanagement", async function(req,res){
try{
if(req.session.adminemail){

var ads = await Advertisement.Ad.find({}).exec();
res.render("adsmanagement",{ads:ads,name :req.session.adminname});

} else{
res.render("admin-login",{error:false});
}
}catch(e){
  console.log("/adsmanagement ", e);
  res.render("admin-login",{error:false});
}
});

app.post("/adupdate", async function(req,res){
try{
if(req.session.adminemail){
  if(req.body.update){
  await Advertisement.Ad.findByIdAndUpdate(req.body.update, { adname : req.body.adname , adspace : req.body.adspace , adspaceposition : req.body.adspaceposition , adurl : req.body.adurl , navigation : req.body.adnav })
  }
res.redirect("/adsmanagement");
}else{
res.render("admin-login",{error:false});
}
}catch(e){
  console.log("/adupdate ", e);
  res.render("admin-login",{error:false});
}
});

app.get("/profits",async function(req,res){
try{
if(req.session.adminemail){
var orders = await CustomerOrder.Order.find({}).exec();
res.render("profits",{orders:orders,name :req.session.adminname});
}else{
res.render("admin-login",{error:false});
}
}catch(e){
  console.log("/profits ", e);
  res.render("admin-login",{error:false});
}
});

app.get("/support", async function(req,res){
try{
if(req.session.email){
res.render("support",{login:true,name:req.session.name,cartcount:req.session.cartcount})
} else{
//res.render("login",{error:false});
res.render("support",{login:false,name:req.session.name,cartcount:req.session.cartcount})
}
}catch(e){
  console.log("/support ", e);
  res.render("login",{error:false});
}
});

app.get("/id/:value", async function(req,res){
try{
if(req.session.email){
  var products = await CompanyProducts.Product.findById(req.params.value).exec();
  if(products){
    var brands = await Type.Brand.find({name :products.parentcompany}).exec();
    res.render("productdetail",{products:products,brands:brands,login:true,name:req.session.name,cartcount:req.session.cartcount})

  }else{
    res.redirect("/*");
  }
} else{
console.log("login");
res.render("login",{error:false});
}
} catch(e){
  console.log("/id/value ", e);
    res.redirect("/*");
}
})

app.all("*",function(req,res){
res.sendFile(__dirname+"/servererror.html");
})

app.listen(process.env.PORT || 3000,function(){
  console.log("Server is live up and running");
})
