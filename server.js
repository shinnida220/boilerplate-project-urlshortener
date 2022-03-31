require('dotenv').config();
const express = require('express');
const cors = require('cors');

// To handle post request body
const bodyParser = require('body-parser');
// Needed for resolving the domain
const dns = require('dns');
// Needed to parse the url
const url = require('url');
// Moongoose for our NoSQL
const mongoose = require('mongoose');

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// Lets create the Url Schema
// const shortUrlSchema = new mongoose.Schema({
//   url: { type: String, required: true },
//   short_url: Number
// });

// Lets create a model 
let ShortUrl = new mongoose.model('ShortUrl', new mongoose.Schema({
  url: { type: String, required: true },
  short_url: Number
}));

app.use(cors())
  // Add the body-parser module
  .use(bodyParser.urlencoded({ extended: false }));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

// Should redirect to the actual link
// Do necessary checks
app.get('/api/shorturl/:urlId', (req, res) => {
  const short_url = req.params?.urlId;
  if (short_url) {
    ShortUrl.find({ short_url: short_url }, (err, urlData) => {
      if (err) {
        res.json({ error: "No short URL found for the given input" });
        res.end();
      }

      // Return a redirect
      res.redirect(urlData.url);
    });
  } else {
    res.json({ error: "No short URL found for the given input" })
  }
});

// To create the actual link
app.post('/api/shorturl', (req, res) => {
  const submittedUrl = req.body?.url;
  if (submittedUrl) {
    try {
      const parsedUrl = new url.URL(submittedUrl);

      if (parsedUrl?.hostname !== undefined) {
        dns.lookup(parsedUrl.hostname, (err, _) => {
          // Dns lookup failed
          if (err) {
            res.json({ error: "Invalid URL" });
            res.end();
          }

          // Count the number of records we already have..
          ShortUrl.find().count((er, totalRecords) => {
            // We couldn't count, should happen, but it happened..
            if (er) {
              res.json({ error: "Please try again a bit later" });
              res.end();
            }

            new ShortUrl({
              url: submittedUrl,
              shor_url: (totalRecords + 1),
            }).save((e, urlData) => {
              if (e) {
                res.json({ error: e });
                res.end();
              }

              // Finally a response
              res.json({
                original_url: submittedUrl, short_url: urlData.shor_url
              });
            });
          })

        });
      } else {
        // We couldn't parse the url..
        res.json({ error: "Invalid URL" });
      }
    } catch (allErr) {
      res.json({ error: "Invalid URL" });
    }
  } else {
    // nothing was submitted
    res.json({ error: "Invalid URL" });
  }
});

// Connect to the moongoose server
mongoose.connect(process.env.MONGO_URI).then(_ => {
  // Listen for requests
  app.listen(port, function () {
    console.log(`Listening on port ${port}`);
  });
}).catch(err => {
  // No need to start listening if we cant connect to db..
  console.log('Error while trying to connect to the database', err);
});


