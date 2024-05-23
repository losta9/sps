const mongoose = require("mongoose");

const TeacherShemas = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  mobile: String,
  password: String,
  code: { type: String, unique: true },
  subject: String,
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
  },
});

mongoose.model("TeacherInfo", TeacherShemas);
