const mongoose = require('mongoose')

mongoose.connect(process.env.MONGO_URI)
// mongoose.connect("mongodb://127.0.0.1:27017/DamnProject")

const userSchema = mongoose.Schema({
    name: String,
    email: String,
    mobile: Number,
    gender: String,
    age: Number,
    password: String,
    profilepic: {
        type:String,
        default: "default.png"
    },
    posts:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "post"
    }]
})

module.exports = mongoose.model("user",userSchema)