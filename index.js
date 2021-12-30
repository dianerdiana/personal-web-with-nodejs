const { query } = require("express")
const express = require("express")
const bcrypt = require('bcrypt')


const db = require('./connection/db')
const upload = require('./middlewares/upload-files')


const session = require('express-session')
const flash = require('express-flash')

const app = express()
const PORT = 5007
const isLogin = true // Conditional static

let blogs = [{
    title: 'Pasar Coding di Indonesia Dinilai Masih Menjanjikan',
    post_at: '12 Jul 2021 22:30 WIB',
    author: 'Ichsan Emrald Alamsyah',
    content: 'Ketimpangan sumber daya manusia (SDM) di sektor digital masih menjadi isu yang belum terpecahkan. Berdasarkan penelitian ManpowerGroup, ketimpangan SDM global, termasuk Indonesia, meningkat dua kali lipat dalam satu dekade terakhir.'
}]
let month = [
    "January", 
    "February", 
    "March", 
    "April", 
    "May", 
    "June", 
    "July", 
    "August", 
    "September", 
    "October", 
    "November", 
    "December"
    ]

app.set('view engine', 'hbs') // set template engine

app.use('/public', express.static(__dirname+'/public')) // set folder to public
app.use('/uploads', express.static(__dirname+'/uploads'))
app.use(express.urlencoded({ extended: false }))

app.use(
    session({
        cookie: {
            maxAge: 2*60*60*1000,
            secure: false,
            httpOnly: true
        },
        store: new session.MemoryStore(),
        saveUninitialized: true,
        resave: false,
        secret: "secretValue"
    })
)

app.use(flash())

// app.get('/', function(req, res) {
//     res.send("Hello World") // only send text
// })

app.get('/home', function(req, res) {

    let query = `SELECT * FROM tb_experience`

    db.connect(function(err, client, done){
        if(err) throw err;

        client.query(query, function(err, result){
            if (err) throw err;

            let data = result.rows
            res.render('index', { table : data})
        })
    })
})

app.get('/blog', function(req, res){

    let query = `SELECT tb_blog.id, tb_blog.title, tb_blog.content, tb_blog.image,
                  tb_user.name AS author, tb_blog.post_date
                    FROM tb_blog LEFT JOIN tb_user ON tb_user.id = tb_blog.author_id`

    db.connect(function(err, client, done){
        if (err) throw err;
        client.query(query, function(err, result){
            done()
            let data = result.rows
            let dataTable = data.map(function(tiger){
                return {
                    ...tiger,
                    isLogin: req.session.isLogin,
                    image: '/uploads/' + tiger.image,
                    post_at: getFullTime(tiger.post_date),
                    post_age: getDistanceDate(tiger.post_date)
                }
            })
            res.render('blog', 
                { 
                  isLogin: req.session.isLogin, 
                  blogs: dataTable,
                  user: req.session.user
                })
        })
    })
})

app.get('/add-blog', function(req, res) {
    res.render('add-blog') // render file add-blog
})

app.get('/blog-detail/:id', function(req,res){ // Query string e.x

    let id = req.params.id

    db.connect(function(err, client, done){
        if (err) throw err;
        client.query(`SELECT * FROM tb_blog WHERE id = ${id}`, function(err, result){
            done()
            let data = result.rows[0]

            res.render('blog-detail', {isLogin: isLogin, blog: data})
        })
    })
})

app.get('/contact-me', function(req, res) {
    res.render('contact-form')
})

app.get('/register', function(req, res){
    res.render('register')
})

app.get('/login', function(req, res){
    res.render('login')
})

app.get('/logout', function(req, res){
  req.session.destroy()

  res.redirect('/login')
})

app.get('/delete-blog/:id', function(req, res) {
  let id = req.params.id
  let query = `DELETE FROM tb_blog WHERE id = ${id}`

  db.connect( function(err, client, done) {
      if(err) throw err

      client.query(query, function(err, result){
          if(err) throw err

          res.redirect('/blog')
      })
  })
})

app.get('/edit-blog/:id', function(req, res) {
    
    let id = req.params.id
    let query = `SELECT * FROM tb_blog WHERE id = ${id}`

    db.connect(function(err, client, done){
        if(err) throw err;
        client.query(query, function(err, result){
            let data = result.rows[0]

            res.render('edit-blog', { blog: data })
        })
    })
})

app.post('/edit-blog/:id', function(req, res) {

    let id = req.params.id
    let data = req.body
    let query = `UPDATE tb_blog SET title = '${data.title}', content = '${data.content}' WHERE id = ${id}`

    db.connect(function(err, client, done){
        if (err) throw err

        client.query(query, function(err, result){
            if (err) throw err

            res.redirect('/blog')
        })
    })
})

app.post('/blog', upload.single('image'),function(req,res){
  let data = req.body

  if(!req.session.user) {
    req.flash('danger', 'Please Login!')
    return res.redirect('/add-blog')
  }

  if(!req.file.filename) {
    req.flash('danger', 'Please insert all fields!')
    return res.redirect('/add-blog')
  }

  let authorId = req.session.user.id
  let image = req.file.filename

  let query = `INSERT INTO tb_blog(title, content, image, author_id) VALUES ('${data.title}', '${data.content}', '${image}', '${authorId}')`

  db.connect( function(err, client, done) {
      if(err) throw err

      client.query(query, function(err, result){
          if(err) throw err

          res.redirect('/blog')
      })
  })
})

app.post('/register', function(req, res){
  const data = req.body
  
  const hashedPassword = bcrypt.hashSync(data.password, 10)
  let query = `INSERT INTO tb_user (name, email, password) VALUES ('${data.name}', '${data.email}', '${hashedPassword}')`

  db.connect(function(err, client){
      if (err) throw err
      client.query(query, function(err, result){
          if (err) throw err

          res.redirect('/login')
      })
  })
})

app.post('/login', function(req, res){

  const {email, password} = req.body

  let query= `SELECT * FROM tb_user WHERE email = '${email}'`

  db.connect(function(err, client){
      if(err) throw err;

      client.query(query, function(err, result) {
          if (err) throw err;
        //   console.log(result.rows)

          if (result.rows.length == 0) {
              req.flash('danger', 'Email and password do not match!')

              return res.redirect('/login')
          }

          let isMatch = bcrypt.compareSync(password, result.rows[0].password)

          if (isMatch) {
              req.session.isLogin = true,
              req.session.user = {
                  id : result.rows[0].id,
                  name : result.rows[0].name,
                  email : result.rows[0].email
              }

              req.flash('success', 'Login success')
              res.redirect('/blog')
          } else {
              req.flash('danger', 'Email and password do not match!')

              res.redirect('/login')
          }
      })
  })
})

app.post('/logout', function(req, res){

})

// to bind and listen the connections on the specified host and hosting
app.listen(PORT, function(){
    console.log(`Server is running on PORT: ${PORT}`);
})

function getFullTime(time) {

    /* This is new Date() default value:
    Mon Dec 20 2021 09:05:06 GMT+0700 (Waktu Indonesia Barat)*/
    
    let date = time.getDate() //tanggal getDate()
    let monthIndex = time.getMonth() //Bulan getMonth()
    let year = time.getFullYear() //Tahun getFullYear()

    let hours = time.getHours() //Jam getHours()
    let minutes = time.getMinutes() //Menit getMinutes()

    let fullTime = `${date} ${month[monthIndex]} ${year} ${hours}:${minutes} WIB`

    return fullTime
}

function getDistanceDate(time) {

  let timePost = time
  let timeNow = new Date()
  
  let distance = timeNow - timePost;

  let milliSecond = 1000 // milisecond in 1 second
  let secondInHours = 3600 // second in 1 hour
  let hoursInDay = 23 // hours in 1 day

  let distanceDay = Math.floor(distance / (1000 * 3600 * 23))

  if (distanceDay >= 1) {
      return `${distanceDay} days ago`
  } else {
      //convert to hours
      let distanceHours = Math.floor(distance / (1000 * 3600))

      if (distanceHours >= 1) {
          return`${distanceHours} hours ago`
      } else {
          //convert to minutes
          let distanceMinutes = Math.floor(distance / (1000 * 60))

          if (distanceMinutes) {
              return `${distanceMinutes} minutes ago`
          } else {
              let distanceSecond = Math.floor(distance / 1000)
              
              return `${distanceSecond} seconds ago`
          }
      }
  }
}