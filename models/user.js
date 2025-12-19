const mongoose = require('mongoose')

mongoose.connect(process.env.MONGO_URI)

const userSchema = mongoose.Schema({
    name: String,
    email: String,
    mobile: Number,
    gender: String,
    age: Number,
    password: String,
    posts:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: "post"
    }]
})

module.exports = mongoose.model("user",userSchema)