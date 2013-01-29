var request = require('request');
var jsdom = require('jsdom');

var url = 'http://opac.warwick.ac.uk/search~S15?/ftlist^bib31%2C1%2C0%2C37/mode=2';

var data = [];  

function fetch(url, builder, callback) {
  request({ uri: url }, 
    function (error, response, body) {
      if (error && response.statusCode !== 200) {
        callback(null, 'Error when contacting remote site')
      }
      jsdom.env({
        html: body,
        scripts: [
          'http://code.jquery.com/jquery-1.5.min.js'
        ]
      }, function (err, window) {
        var $ = window.jQuery;
        var data = [];
        builder($, data, callback);
      })
    }
  )
}




var express = require('express');
var app = express();

function builder($, items, callback) {
      $('div.briefcitRow').each(function(i, item) {
        var jacket = $(item).find('div.briefcitJacket img');
        var title = $(item).find('div.briefcitTitle');
        var main = $(item).find('div.briefcitDetailMain');
        var lines = $(main).text().trim().split("\n");
        var item = {  
          'title': $(title).text().trim(), 
          'link': $(title).attr('href'),
          'jacket': $(jacket).attr('src').replace('CaptionBelow=t', 'CaptionBelow=f'),
          'description': {
            'line1': lines[1],
            'line2': lines[2],
            'line3': lines[3]
          } 
        }
        if (item.jacket !== undefined || item.jacket !== null) {
          items.push(item)
        }
      });
      callback(items);
    }

app.get('/lists/1', function(req, res) {
  fetch('http://opac.warwick.ac.uk/search~S15?/ftlist^bib31%2C1%2C0%2C37/mode=2',
    builder, function(items) {
      res.send({ results : items });
    });  
});
app.get('/lists/2', function(req, res) {
  fetch('http://opac.warwick.ac.uk/search~S15?/ftlist^bib13%2C1%2C0%2C10/mode=2',
    builder, function(items) {
      res.send({ results : items });
    });  
});
app.use(express.static('public'))
app.listen(3000);