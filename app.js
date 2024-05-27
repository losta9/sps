const express = require("express");
const app = express();
const mongoose = require("mongoose");
app.use(express.json());
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cron = require("node-cron");
require("dotenv").config();

// const mongourl = process.env.Mongodb_URL;
const mongourl =
  "mongodb+srv://axyz28475:axyz28475@cluster0.p2kglk5.mongodb.net/?retryWrites=true&w=majority";
// const JWT_SECRET = process.env.JWT;
const JWT_SECRET =
  "hasljnvaseijwe093489()lkjfnijgjsk{jflakjfieurq37083ikgkngnf}aldkbzxcv[bsa]]hfeiof";
const port = 3001;
app.listen(port, () => {
  console.log("====================================");
  console.log("server running on ", port);
  console.log("====================================");
});

mongoose
  .connect(mongourl)
  .then(() => {
    console.log("database connected");
  })
  .catch((e) => {
    console.log(e);
  });
require("./userSchemas");
require("./teacherSchemas");
require("./coursesSchmas");
require("./notificationSchemas");

const User = mongoose.model("UserInfo");
const Teacher = mongoose.model("TeacherInfo");
const Course = mongoose.model("CourseSchema");
const Notification = mongoose.model("Notification");

app.get("/", (req, res) => {
  res.send({ status: "Started" });
});

app.post("/register", async (req, res) => {
  console.log("Request Body:", req.body);
  const { name, email, mobile, password } = req.body;
  const oldUser = await User.findOne({ email: email });
  if (oldUser) {
    return res.send({ data: "User already exist" });
  }
  const encryptedPassword = await bcrypt.hash(password, 10);
  try {
    await User.create({
      name: name,
      email: email,
      mobile: mobile,
      password: encryptedPassword,
    });
    res.send({ status: "ok", data: "User created" });
  } catch (error) {
    res.send({ status: "error", data: error });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const USER = await User.findOne({ email: email });

  if (!USER) {
    return res.send({ data: "User dosent Exist" });
  }
  if (bcrypt.compare(password, USER.password)) {
    const token = jwt.sign({ email: USER.email }, JWT_SECRET);
    if (res.status(201)) {
      return res.send({ status: "ok", data: USER, tokan: token });
    } else {
      return res.send({ error: "error" });
    }
  }
});

app.post("/registerteacher", async (req, res) => {
  console.log("Request Body:", req.body);
  const { name, email, mobile, password, code } = req.body;

  // Check if user with the given email or code already exists
  const oldUser = await Teacher.findOne({
    $or: [{ email: email }, { code: code }],
  });

  if (oldUser) {
    return res.send({ data: "User already exist" });
  }
  const encryptedPassword = await bcrypt.hash(password, 10);
  try {
    await Teacher.create({
      name: name,
      email: email,
      mobile: mobile,
      password: encryptedPassword,
      code: code,
    });
    res.send({ status: "ok", data: "Teacher created" });
  } catch (error) {
    res.send({ status: "error", data: error });
  }
});

app.post("/loginteacher", async (req, res) => {
  const { email, password } = req.body;
  const USER = await Teacher.findOne({ email: email });

  if (!USER) {
    return res.send({ data: "User dosent Exist" });
  }
  if (await bcrypt.compare(password, USER.password)) {
    const token = jwt.sign({ email: USER.email }, JWT_SECRET);
    if (res.status(201)) {
      // console.log("user :", USER);
      return res.send({ status: "ok", data: USER, tokan: token });
    } else {
      return res.send({ error: "error" });
    }
  }
});

app.post("/api/courses", async (req, res) => {
  const { students, subjects, duration, courseName } = req.body;
  console.log("====================================");
  console.log(students, subjects, duration, courseName);
  console.log("====================================");
  try {
    const newCourse = await Course.create({
      students: students,
      subjects: subjects,
      duration: duration,
      courseName: courseName,
    });
    // Update courseId in Student
    await User.updateMany(
      { _id: { $in: students } },
      { $set: { courseId: newCourse._id } }
    );

    // Update courseId in teachers
    await Teacher.updateMany(
      { _id: { $in: subjects.map((teacher) => teacher.teacherId) } },
      { $set: { courseId: newCourse._id } }
    );
    res.send({ status: "ok", data: "Course created" });

    console.log("====================================");
    console.log(newCourse);
    console.log("====================================");
    // res.status(201).json({ status: 'success', data: newCourse });
  } catch (error) {
    res.send({ status: "error", data: error });
    // res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get("/api/courses", async (req, res) => {
  try {
    const CourseDetails = await Course.find()
      .populate({
        path: "students",
        model: User,
      })
      .populate({
        path: "subjects.teacherId",
        model: Teacher,
      });

    console.log(CourseDetails);

    res.json(CourseDetails);
  } catch (error) {
    console.error("Error fetching Course:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/api/courses/:id", async (req, res) => {
  const courseId = req.params.id;
  console.log("====================================");
  console.log(courseId);
  console.log("====================================");

  try {
    // Find the course by ID and delete it
    const deletedCourse = await Course.findByIdAndDelete(courseId);

    if (!deletedCourse) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json(deletedCourse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/api/students/:studentId/courses/:courseId", async (req, res) => {
  const { studentId, courseId } = req.params;
  console.log(studentId);

  try {
    const updatedStudent = await User.findByIdAndUpdate(studentId, {
      courseId: null,
    });

    if (!updatedStudent) {
      return res.status(404).json({ error: "Student not found" });
    }

    const updatedCourse = await Course.findByIdAndUpdate(courseId, {
      $pull: { students: studentId },
    });

    if (!updatedCourse) {
      return res.status(404).json({ error: "Course not found" });
    }
    console.log("succefuly deleted student from course");
    res.json({ updatedStudent, updatedCourse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/api/students/:studentId/courses/:courseId", async (req, res) => {
  const { studentId, courseId } = req.params;
  console.log(studentId);

  try {
    const updatedStudent = await User.findByIdAndUpdate(studentId, {
      courseId: courseId,
    });

    if (!updatedStudent) {
      return res.status(404).json({ error: "Student not found" });
    }

    const updatedCourse = await Course.findByIdAndUpdate(courseId, {
      // $pull: { students: studentId },
      $push: { students: studentId },
    });

    if (!updatedCourse) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json({ updatedStudent, updatedCourse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/api/course/:courseId/week", async (req, res) => {
  const { courseId } = req.params;
  const data = req.body;
  console.log("req.params :", courseId);
  console.log("data", data);
  try {
    const updatedCourse = await Course.findByIdAndUpdate(courseId, {
      // $pullAll: { weeks: [] },
      // $push: { weeks: data },
      $set: { weeks: data },
    });

    if (!updatedCourse) {
      return res.status(404).json({ error: "Course not found" });
    }
    console.log("update succefully", updatedCourse);
    res.json({ updatedCourse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/course/:id", async (req, res) => {
  const courseId = req.params.id;
  console.log("====================================");
  console.log(courseId);
  console.log("====================================");

  try {
    // Find the course by ID and delete it
    const getCourse = await Course.findById(courseId)
      .populate({
        path: "students",
        model: User,
      })
      .populate({
        path: "subjects.teacherId",
        model: Teacher,
      });

    if (!getCourse) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json(getCourse);
    console.log("getCourse", getCourse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/students", async (req, res) => {
  try {
    const students = await User.find();
    //   console.log(students);
    res.json(students);
  } catch (error) {
    console.error("Error fetching students:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/teachers", async (req, res) => {
  try {
    const responce = await Teacher.find();
    res.json(responce);
  } catch (error) {
    console.error("Error fetching Teacher:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/teacher/:email", async (req, res) => {
  const { email } = req.params;
  console.log(email);

  try {
    const teacher = await Teacher.findOne({ email });

    if (!teacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }
    console.log("teacher", teacher);
    res.json(teacher);
  } catch (error) {
    console.error("Error fetching teacher details:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/student/:email", async (req, res) => {
  const { email } = req.params;
  console.log(email);

  try {
    const student = await User.findOne({ email });
    console.log("====================================");
    console.log(student);
    console.log("====================================");
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }
    console.log("Student", student);
    res.json(student);
  } catch (error) {
    console.error("Error fetching Student details:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/api/teacher/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const { name, mobile, code, subject } = req.body;
    console.log("====================================");
    console.log(name, email, code);
    console.log("====================================");
    const updatedTeacher = await Teacher.findOneAndUpdate(
      { email },
      { name, mobile, code, subject },
      { new: true, runValidators: true }
    );
    if (!updatedTeacher) {
      return res.status(404).json({ error: "Teacher not found" });
    }
    res.json(updatedTeacher);
  } catch (error) {
    console.error("Error updating teacher information:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/api/student/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const { name, mobile } = req.body;
    console.log("====================================");
    console.log(name, email);
    console.log("====================================");
    const updatedStudent = await User.findOneAndUpdate(
      { email },
      { name, mobile },
      { new: true, runValidators: true }
    );
    if (!updatedStudent) {
      return res.status(404).json({ error: "Student not found" });
    }
    res.json(updatedStudent);
  } catch (error) {
    console.error("Error updating Student information:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/api/notifications", async (req, res) => {
  try {
    const { text, expiration } = req.body;

    const expirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    console.log("expirationDate", expirationDate);
    const newNotification = new Notification({
      text,
      // expiration: expiration ? new Date(expiration) : null,
      expiration: expirationDate,
    });
    console.log(Date(expiration));

    await newNotification.save();
    res.status(201).json({ message: "Notification created successfully." });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

cron.schedule("0 0 12 * *", async () => {
  try {
    const date = new Date();
    console.log("Cron job started at:", date);
    await Notification.deleteMany({
      expiration: { $lte: date },
    });
    console.log("Expired notifications removed successfully.");
  } catch (error) {
    console.error("Error removing expired notifications:", error);
  } finally {
    console.log("Cron job finished at:", new Date());
  }
});

app.get("/api/notifications", async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ timestamp: -1 });
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
