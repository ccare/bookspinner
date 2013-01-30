var request = require('request');
var jsdom = require('jsdom');
var express = require('express');
var app = express.createServer();

var port = process.env.PORT || 3000;

var cache = {};  

var resources = [
  'http://opac.warwick.ac.uk/search~S15?/ftlist^bib13%2C1%2C0%2C10/mode=2',
  'http://opac.warwick.ac.uk/search~S15?/ftlist^bib33%2C1%2C0%2C1/mode=2',
  'http://opac.warwick.ac.uk/search~S15?/ftlist^bib32%2C1%2C0%2C58/mode=2',
  'http://opac.warwick.ac.uk/search~S15?/ftlist^bib31%2C1%2C0%2C37/mode=2'
]


function fetch(index, builder, callback) {
  var loc = resources[index];
  fetchByLocation(loc, builder, callback)
}

function fetchByLocation(loc, builder, callback) {
  if (cache[loc] !== null && cache[loc] !== undefined) {
    callback(cache[loc])
  } else {
    request({ uri: loc }, 
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
          builder($, data, function(data) {
            cache[loc] = data;
            callback(data);
          });
        })
      }
    )
  }
}

function builder($, items, callback) {
      $('div.briefcitRow').each(function(i, item) {
        var jacket = $(item).find('div.briefcitJacket img');
        var title = $(item).find('div.briefcitTitle');
        var main = $(item).find('div.briefcitDetailMain');
        var lines = $(main).text().trim().split("\n");
        var jacketUrl = $(jacket).attr('src');
        if (jacketUrl != null && jacketUrl != undefined) {
          jacketUrl = jacketUrl.replace('CaptionBelow=t', 'CaptionBelow=f')
        }
        var item = {  
          'title': $(title).text().trim(), 
          'link': $(title).attr('href'),
          'jacket': jacketUrl,
          'description': {
            'line1': lines[1],
            'line2': lines[2],
            'line3': lines[3]
          } 
        }
        items.push(item)
      });
      var results = [];
      $.each(items, function(key, item) {
        var jacketUrl = item.jacket;
        if (jacketUrl === null || jacketUrl === undefined) {
          item.jacket = null
          results.push(item);
        } else {
          request({ uri: jacketUrl, method: 'HEAD' }, 
          function (error, response, body) {
            if (error != null) {
              console.log(error);
            } 
            if (response.headers['content-length'] < 100) {
              item.jacket = null;
            }
            results.push(item);
            if (results.length == items.length) {
              callback(items);            
            }
          })
        }
      })
}


app.enable("jsonp callback");
app.get('/lists/:id', function(req, res) {
  var id = req.params.id
  fetch(id, builder, function(items) {
    res.type('application/json');
    res.jsonp( { results : items });  //items is the object
    //  res.send({ results : items });
    });  
});
app.get('/list', function(req, res) {
  var location = req.query.list
  fetchByLocation(location, builder, function(items) {
    res.type('application/json');
    res.jsonp( { results : items });  //items is the object
    //  res.send({ results : items });
    });  
});
app.use(express.static('public'))
app.listen(port);