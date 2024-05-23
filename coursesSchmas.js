const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  students: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
    },
  ],
  subjects: [
    {
      teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teacher",
      },
      subjectName: {
        type: String,
        required: true,
      },
    },
  ],
  duration: {
    type: String,
    required: true,
  },
  courseName: {
    type: String,
    required: true,
  },
  weeks: [
    {
      weekNumber: Number,
      information: [
        {
          info: String,
        },
      ],
    },
  ],
});

mongoose.model("CourseSchema", courseSchema);
