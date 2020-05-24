
# Based on the node.js app from Colt Steele's The Web Developer BootCamp

# General Note:
This app is not intended for public use. Please note that most of the data is fake (randomly generated) and only for testing purposes.

# Technologies:
Front End: HTML, CSS, Bootstrap
Back End: NodeJS, NPM, ExpressJS, REST, PassportJS, MongoDB

# Features:
RestFUL Routing with express and mongoose
Authentication using Passport.js
Password Reset via Email using nodemailer
Image storage via Cloudinary
Google Maps API to render location
Google Places API to populate DB
Search by Post name and creator username
EJS for templating
Responsive Design using Bootstrap 4
Contact form for existing users via Twilio SendGrid API


# Getting Started
Follow the instructions below to set up the environment and run this project on your local machine.
```
1. Clone this repository.

```
2. Install dependencies via NPM or Yarn


```
3. create a .env file and provide following:
ADMIN_CODE,
DATABASEURL,
GMAILPW (or change it completely to a different mailing service)
GEOCODER_API_KEY,
CLOUDINARY_API_KEY,
CLOUDINARY_API_SECRET API,
SENDGRID_API_KEY

```
4. Run the app with "node camp.js"
