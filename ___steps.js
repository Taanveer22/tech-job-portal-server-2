/**
 *
 *  1. install and require jsonwebtoken and cookie-parser
 *
 *  2. set cookie-parser as global middleware
 *
 *  3. set cors middleware for client sever connection
 *     app.use(
 *        cors({
 *          origin: ['http://localhost:5173'],
 *           credentials: true,
 *             })
 *            );
 *
 *
 *  4. create a jwt login route
 *     app.post('/jwt/login', (req, res) => {
 *     const userPayload = req.body;
 *     const tokenValue = jwt.sign(userPayload, process.env.ACCESS_TOKEN_SECRET, {
 *        expiresIn: '1h',
 *     });
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
 *   5. create a jwt logout route
 *       app.post('/jwt/logout', (req, res) => {
 *       res
 *         .clearCookie('token', {
 *         httpOnly: true,
 *         secure: false,
 *         })
 *         .send({ success: true });
 *         });
 *
 *   6.
 *      const verifyToken = (req, res, next) => {
 *      const token = req.cookies?.token;
 *      // no token
 *      if (!token) {
 *          return res.status(401).send({
 *          message: 'Unauthorized access',
 *          });
 *                  }
 *
 *      jwt.verify('token', process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
 *      // invalid token
 *      if (error) {
 *          return res.status(401).send({
 *           message: 'Unauthorized Access',
 *     });
 *                  }
 *
 *      // save decoded user info
 *       req.decoded = decoded;
 *      next();
 *      });
 *
 *                                                      };
 *
 */
