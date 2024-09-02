const { expressjwt: jwt } = require("express-jwt");

function authJwt() {
  const secret = process.env.secret;
  const api = process.env.API_URL;

  return jwt({
    secret,
    algorithms: ["HS256"]
  })
  .unless({
    path: [
      
    
      { url: /\/api\/v1\/users(.*)/ , methods: ['GET','POST','PUT','OPTIONS'] },
      { url: /\/api\/v1\/products(.*)/ , methods: ["GET", "POST", "PUT","OPTIONS"] },

      `${api}/users`,
      `${api}/users/login`,
      `${api}/users/register`,
    ],
  });
}

async function isRevoked(req, payload, done) {
  if (!payload.isAdmin) {
    done(null, true);
  }

  done();
}

module.exports = authJwt
