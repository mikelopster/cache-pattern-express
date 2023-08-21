const express = require('express')
const bodyparser = require('body-parser')
const mysql = require('mysql2/promise')
const redis = require('redis')
const cron = require('node-cron')

const app = express()

app.use(bodyparser.json())

const port = 8000

let conn = null
let redisConn = null

const initMySQL = async () => {
  conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'tutorial'
  })
}

const initRedis = async () => {
  redisConn = redis.createClient()
  redisConn.on('error', err => console.log('Redis Client Error', err))
  await redisConn.connect()
}

// path = GET /users สำหรับ get users ทั้งหมดที่บันทึกเข้าไปออกมา
app.get('/users', async (req, res) => {
  const results = await conn.query('SELECT * FROM users')
  res.json(results[0])
})

app.get('/users/cache-1', async (req, res) => {
  try {
    const cachedData = await redisConn.get('users')

    if (cachedData) {
      // มี cache = ใช้ cache ก่อนไปเลย
      res.json(JSON.parse(cachedData))
      return
    }

    // User data not found in cache, fetch from MySQL
    const [results] = await conn.query('SELECT * FROM users')
    // Store user data in Redis cache
    await redisConn.set('users', JSON.stringify(results))
    res.json(results)
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

app.get('/users/cache-2', async (req, res) => {
  try {
    const cachedData = await redisConn.get('users-2')
    if (cachedData) {
      // มี cache = ใช้ cache ก่อนไปเลย
      res.json(JSON.parse(cachedData))
      return
    }

    // User data not found in cache, fetch from MySQL
    const [results] = await conn.query('SELECT * FROM users')
    res.json(results)
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

app.post('/users', async (req, res) => {
  try {
    let user = req.body
    // insert ข้อมูลใส่ database
    const [results] = await conn.query('INSERT INTO users SET ?', user)
    user.id = results.insertId

    // เขียน cache ใหม่ด้วย
    let cachedData = await redisConn.get('users-2')
    let newData = []

    if (cachedData) {
      const loadDataCache = JSON.parse(cachedData)
      newData = loadDataCache.concat(user)
      await redisConn.set('users-2', JSON.stringify(newData))
    } else {
      const [results] = await conn.query('SELECT * FROM users')
      await redisConn.set('users-2', JSON.stringify(results))
    }

    res.json({
      message: 'insert ok',
      dataAdded: user
    })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

app.get('/users/cache-3', async (req, res) => {
  try {
    const cachedData = await redisConn.get('users-3')
    if (cachedData) {
      // มี cache = ใช้ cache ก่อนไปเลย
      res.json(JSON.parse(cachedData))
      return
    }

    // User data not found in cache, fetch from MySQL
    const [results] = await conn.query('SELECT * FROM users')
    res.json(results)
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

app.put('/users/:id', async (req, res) => {
  try {
    let user = req.body
    let id = parseInt(req.params.id)
    user.id = id

    // เขียน cache ใหม่ด้วย
    let cachedData = await redisConn.get('users-3')
    let updateIndexList = await redisConn.get('update-users-3') || []

    let updateData = ''
    if (cachedData) {
      const loadDataCache = JSON.parse(cachedData)
      let selectedIndex = loadDataCache.findIndex(user => user.id === id)
      loadDataCache[selectedIndex] = user
      updateIndexList.push(selectedIndex)
      updateData = loadDataCache
    } else {
      const [results] = await conn.query('SELECT * FROM users')
      let selectedIndex = results.findIndex(user => user.id === id)
      results[selectedIndex] = user
      updateIndexList.push(selectedIndex)
      updateData = results
    }

    await redisConn.set('users-3', JSON.stringify(updateData))
    await redisConn.set('update-users-3', JSON.stringify(updateIndexList))

    res.json({
      message: 'update ok',
      dataAdded: user
    })
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

let waiting = false
cron.schedule('*/10 * * * * *', async () => {
  console.log('running every 10 seconds', waiting)
  try {
    if (waiting) {
      return
    }
    const cachedData = await redisConn.get('users-3')
    const updateIndexListCached = await redisConn.get('update-users-3')

    if (updateIndexListCached) {
      waiting = true
      const updateIndexList = JSON.parse(updateIndexListCached)
      const userData = JSON.parse(cachedData)

      for (let i = 0; i < updateIndexList.length; i++) {
        const index = updateIndexList[i]
        const selectedUser = userData[index]

        const id = selectedUser.id
        const updateUser = {
          name: selectedUser.name,
          age: selectedUser.age,
          description: selectedUser.description
        }

        const [results] = await conn.query(
          'UPDATE users SET ? WHERE id = ?',
          [updateUser, id]
        )

        console.log('=== update complete !', results)
      }

      await redisConn.del('update-users-3')
      waiting = false
    }
  } catch (error) {
    console.error('Error:', error)
    res.status(500).json({ error: 'An error occurred' })
  }
})

app.listen(port, async (req, res) => {
  await initMySQL()
  await initRedis()
  console.log('http server run at ' + port)
})