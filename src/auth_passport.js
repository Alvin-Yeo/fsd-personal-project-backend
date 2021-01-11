// load libraires
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { getUser } = require('./db_mysql');

// confiure passport with a strategry
passport.use(
    new LocalStrategy(
        {
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true
        },
        async(req, user, password, done) => {
            // perform the authentication
            console.info(`[INFO] Authenticating username: ${user} ...`);

            const results = await getUser([ user, password ]);

            if(results.length > 0) {
                done(null, { username: user });
                return;
            }

            done('Incorrect username or password.', false);
            console.error(`[ERROR] Authentication failed.`);
       }
    )
);

// custom auth middleware
const mkAuth = (passport) => {
    return (req, res, next) => {
        passport.authenticate('local', 
            (err, user, info) => {
                if(null != err) {
                    res.status(401);
                    res.type('application/json');
                    res.json({ error: err });
                    return;
                }
                if(!user) {
                    res.status(401);
                    res.type('application/json');
                    res.json({ error: err });
                    return;
                }
                req.user = user;
                next();
            }
        )(req, res, next);
    }
};

const localStrategyAuth = mkAuth(passport);


module.exports = { passport, localStrategyAuth };