var Nightmare = require('nightmare');
var vo = require('vo');
var moment = require('moment');
var _ = require('lodash');
var colors = require('colors/safe');

// lol
moment.createFromInputFallback = function(config) {
  config._d = new Date(config._i);
};

vo(run)(function(err, result) {
  if (err) throw err;
});

function *run() {
  console.log('Loading...')
  var nightmare = Nightmare({ show: false });
  var courses = yield nightmare
    .goto('https://mycourses.aalto.fi/login/index.php')
    .click('.greenloginbtn')
    .insert('#username', process.env.AALTO_USERNAME)
    .insert('#password', process.env.AALTO_PASSWORD)
    .click('.form-button')
    .wait('.course_title')
    .goto('https://mycourses.aalto.fi/my/index.php?mynumber=-2')
    .evaluate(function() {
      var data = [];

      [].forEach.call(document.querySelectorAll('.coursebox'), function(coursebox) {
        // do whatever
        var courseName = coursebox.querySelector('.title a').textContent;
        var assignments = [];
        [].forEach.call(coursebox.querySelectorAll('.assign'),  function(assignment) {
          var assignmentName = assignment.querySelector('.name a').textContent;
          var assignmentDateText = assignment.querySelector('.info').textContent.split(': ')[1];
          var assignmentDetails = assignment.querySelector('.details').textContent;
          var assignmentDate = new Date(assignmentDateText);
          if (!assignmentDetails.includes('Submitted')) {
            assignments.push({
              name: assignmentName,
              date: assignmentDate,
              dateText: assignmentDateText,
              details: assignmentDetails,
            });
          }
        });

        data.push({
          name: courseName,
          assignments: assignments,
        });
      });

      return data;
    });

  yield nightmare.end();

  var sortedCourses = _(courses)
    .filter((course) => course.assignments.length)
    .filter(function hideCourse(course) {
      var courseCode = course.name.split(' - ')[0];
      return !_.some((process.env.AALTO_HIDE || '').split(' '), (x) => x === courseCode);

      //console.log(course.name);
      //return !course.name.match(process.env.AALTO_HIDE || '');
    })
    .sortBy(function sortByAssignment(course) {
      var dates = _(course.assignments).map('dateText').map((x) => moment(x).unix()).value();
      return Math.min.apply(null, dates);
    })
    .value();

  for (var course of sortedCourses) {
    console.log(colors.bold(course.name));
    for (var assignment of course.assignments) {
      var date = moment(assignment.dateText);
      if (moment() > date) {
        console.log('-', assignment.name, colors.red(date.fromNow()));
      } else if (moment().add(2, 'days') > date) {
        console.log('-', assignment.name, colors.red.bgWhite(date.fromNow()));
      } else if (moment().add(8, 'days') > date) {
        console.log('-', assignment.name, colors.yellow(date.fromNow()));
      } else if (moment().add(14, 'days') > date) {
        console.log('-', assignment.name, colors.green(date.fromNow()));
      } else {
        console.log('-', assignment.name, date.fromNow());
      }
    }
  }
  /*

  _.filter()
  for (var course of courses) {
    if (course.assignments.length) {
      console.log(course.name);
      for (var assignment of course.assignments) {
        console.log(assignment);
        console.log('- ', assignment.name, moment(assignment.dateText).toNow());
      }
    }
  }
  */

}
