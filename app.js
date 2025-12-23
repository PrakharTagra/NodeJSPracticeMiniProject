const express = require('express')
const app = express()
const path = require('path')
const userModel = require('./models/user')
const postModel = require('./models/post')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const user = require('./models/user')
const upload = require('./config/multerconfig')

app.use(cookieParser()) 
app.set("view engine","ejs")
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(express.static(path.join(__dirname,"public")))

app.use((req,res,next)=>{
    if(req.cookies.token){
        const data = jwt.verify(req.cookies.token,"secretkey")
        res.locals.user = data
    }
    else{
        res.locals.user = null
    }
    next()
})

app.get("/",(req,res)=>{
    res.render("index")
})

app.post("/register",async (req,res)=>{
    let {name,email,mobile,gender,age,password} = req.body
    
    let user = await userModel.findOne({email})
    if(user) return res.status(500).redirect("error")
    
    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(password,salt, async (err,hash)=>{
            let user = await userModel.create({
            name,
            email,
            mobile,
            gender,
            age,
            password:hash,
        })
            let token = jwt.sign({email:email,userid:user._id},"secretkey")
            res.cookie("token",token)
            res.redirect(`/user/${user._id}`)
        })
    })
})

app.get("/logout",(req,res)=>{
    res.cookie("token","")
    res.redirect("/login")
})

app.get("/login",(req,res)=>{
    res.render("login")
})

app.post("/login",async (req,res)=>{
    let {email,password} = req.body
    let user = await userModel.findOne({email})
    if(!user) return res.status(400).redirect("error")

    bcrypt.compare(password,user.password,(err,result)=>{
        if(result){
            let token = jwt.sign({email:email,userid:user._id},"secretkey")
            res.cookie("token",token)
            return res.status(200).redirect(`/user/${user._id}`)
        }
        else return res.redirect("error")
    })
})

app.get("/profile/:id",isLoggedIn,async (req,res)=>{
    let user = await userModel.findOne({_id:req.params.id})
    res.render("profile",{name:user.name,email:user.email,mobile:user.mobile,gender:user.gender,age:user.age,id:req.params.id,profilepic:user.profilepic})
})

app.get("/error",(req,res)=>{
    res.render("error")
})

function isLoggedIn(req,res,next){
    if(req.cookies.token === ""){
        return res.redirect("/login")
    }
    else{
        let data = jwt.verify(req.cookies.token,"secretkey")
        req.user = data
        next()
    }
}

app.get("/editprofile/:id", async (req,res)=>{
    let user = await userModel.findOne({_id:req.params.id})
    res.render("editprofile",{name:user.name,email:user.email,mobile:user.mobile,gender:user.gender,age:user.age,id:req.params.id})
})

app.post("/editprofile/:id", async (req,res)=>{
    let {name,email,mobile,gender,age} = req.body

    let user = await userModel.findOne({email})
    if(!user) return res.redirect("/error")
    else{
        let user = await userModel.findOneAndUpdate({_id:req.params.id},{name,email,mobile,age,gender},{new:true})
        res.redirect(`/profile/${user._id}`)
    }
})

app.post("/profilepic/:id",upload.single("image"),async (req,res)=>{
   const user = await userModel.findOne({_id:req.params.id})
   user.profilepic = req.file.filename
   user.save()
   res.redirect(`/profile/${req.params.id}`)
})

app.get("/admin",(req,res)=>{
    res.render("admin")
})

const ADMIN_CODE = "ADMIN-2026";

app.post("/admin/login",async(req,res)=>{
    let {email,password,adminCode} = req.body
    let user = await userModel.findOne({email})
    if(!user) return res.redirect("/error")
    if(adminCode != ADMIN_CODE){
        return res.redirect("/error")
    }
    bcrypt.compare(password,user.password, async (err,result)=>{
        if(result){
            let token = jwt.sign({email:email,userid:user._id},"secretkey")
            res.cookie("token",token)
            return res.status(200).redirect("/admindashboard")
        }
        else{
            return res.redirect("/error")
        }
    })
})

app.get("/admindashboard", async (req,res)=>{
    let users = await userModel.find()
    res.render("admindashboard",{users})
})

app.post("/admin/delete/:id",async(req,res)=>{
    let user = await userModel.findOneAndDelete({_id:req.params.id})
    res.redirect("/admindashboard")
})

app.get("/admin/edit/:id",async(req,res)=>{
    let user = await userModel.findOne({_id:req.params.id})
    res.render("adminedit",{user})
})

app.post("/admin/edit/:id",async (req,res)=>{
    let {name,email,mobile,gender,age} = req.body
    let user = await userModel.findOne({email})
    if(!user) return res.redirect("/error")
    else{
        let user = await userModel.findOneAndUpdate({_id:req.params.id},{name,email,mobile,age,gender},{new:true})
        res.redirect(`/admindashboard`)
    }
})

app.get("/user/:id",isLoggedIn,async (req,res)=>{
    let user = await userModel.findOne({_id:req.params.id})
    let posts = await postModel.find().populate("user")
    res.render("userdashboard",{user,posts})
})

app.get("/post/create/:id",async (req,res)=>{
    let user = await userModel.findOne({_id:req.params.id})
    res.render("createpost",{user})
})

app.post("/post/create/:id",async (req,res)=>{
    let user = await userModel.findOne({_id:req.params.id})
    let {posthead,postdata} = req.body
    let post = await postModel.create({
        user:user._id,
        postdata,
        posthead,
    })
    user.posts.push(post._id)
    await user.save()
    res.redirect(`/user/${user._id}`)
})

app.get("/posts/:id",async(req,res)=>{
    let user = await userModel.findOne({_id:req.params.id}).populate("posts")
    let post = await postModel.findOne({_id:user.posts}).populate("likes")
    res.render("posts",{user,post})
})

app.get("/post/edit/:userid/:postid", async (req,res)=>{
    let user = await userModel.findOne({_id:req.params.userid})
    let post = await postModel.findOne({_id:req.params.postid})
    res.render("postedit",{post,user})
})

app.post("/post/edit/:userid/:postid", async (req,res)=>{
    let {postdata,posthead} = req.body
    let post = await postModel.findOneAndUpdate({_id:req.params.postid},{postdata,posthead},{new:true})
    res.redirect(`/posts/${req.params.userid}`)
})

app.post("/post/delete/:userid/:postid",async (req,res)=>{
    let post = await postModel.findOneAndDelete({_id:req.params.postid})
    let user = await userModel.findOne({_id:req.params.userid})
    user.posts.pull(post._id)
    user.save()
    res.redirect(`/posts/${req.params.userid}`)
})

app.get("/post/like/:postid/:userid",async (req,res)=>{
    let users = await userModel.findOne({_id:req.params.userid})
    let post = await postModel.findOne({_id:req.params.postid})
    
    if(post.likes.indexOf(req.params.userid)===-1){
        post.likes.push(req.params.userid)
    }
    else{
        post.likes.splice(post.likes.indexOf(req.params.userid),1)
    }

    await post.save()
    res.redirect(`/user/${req.params.userid}`)
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});