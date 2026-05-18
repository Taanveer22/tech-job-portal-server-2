/**
 *
 *  1. install and require jsonwebtoken and cookie-parser
 *  2. set cookie-parser as global middleware
 *  3. create a jwt login token
 *
 *     app.post('/jwt/login', (req, res) => {
 *     const userPayload = req.body;
 *     const tokenValue = jwt.sign(userPayload, process.env.ACCESS_TOKEN_SECRET, {
 *        expiresIn: '1h',
 *     });
 *
 *     res
 *        .cookie('token', tokenValue, {
 *         httpOnly: true,
 *         secure: false,
 *         sameSite : 'lax',
 *       })
 *       .send({ success: true });
 *   });
 *
 *
 */
