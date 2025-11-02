const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const app = express()

app.use(express.json())

const dataBaseServer = path.join(__dirname, 'covid19IndiaPortal.db')
let db = null
// this is called hosting if we call a function before the called funcation then it will make it as 1-> called funcation then 2-> calling funcation
const initializeADbConnection = async () => {
  try {
    db = await open({
      filename: dataBaseServer,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('connections completed')
    })
  } catch (e) {
    console.log(e.message)
    process.exit(1)
  }
}
initializeADbConnection()
// first api call
app.post('/login/', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await db.get('SELECT * FROM user WHERE username = ?', [username]);

    if (!user) {
      res.status(400).send('Invalid user'); // ✅ exact text
      return;
    }

    const match = await bcrypt.compare(password, user.password);

    if (match) {
      const token = jwt.sign({ username: user.username }, 'MY_SECRETE_KEY');
      res.status(200).send({ jwtToken: token }); // ✅ exact key name
    } else {
      res.status(400).send('Invalid password'); // ✅ exact text
    }
  } catch (e) {
    console.error(e.message);
    res.status(500).send('Server error');
  }
});


const verifyUser = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).send('Invalid JWT Token'); // ✅ exact text
    return;
  }
  try {
    const decoded = jwt.verify(token, 'MY_SECRETE_KEY');
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).send('Invalid JWT Token'); // ✅ exact text
  }
};

// second api call
app.get('/states/', verifyUser, async (req, res) => {
  try {
    const allStatesQuery = `select * from state`
    const getStates = await db.all(allStatesQuery)
    const getStatesLen = getStates.length
    if (getStatesLen > 0) {
      res.status(200).send({msg: 'Seccessflly fetched the States', getStates})
    } else {
      res.status(404).send({msg: 'No States'})
    }
  } catch (e) {
    console.log(e.message)
    res.status(500).send({msg: 'Server Error'})
  }
})
//Third api call
app.get('/states/:stateId/', verifyUser, async (req, res) => {
  const {stateId} = req.params
  try {
    const getStateByIdQuery = `select * from state where state.state_id = ?`
    const getStateById = await db.get(getStateByIdQuery, [stateId])
    if (!getStateById) {
      res.status(400).send({msg: 'Faild to Fecth State by Id'})
      return
    } else {
      res
        .status(200)
        .send({msg: 'Successfully Fetched the State by Id', getStateById})
    }
  } catch (e) {
    console.log(e.message)
    res.status(500).send({msg: 'Server Error'})
  }
})
//Forth api Call
app.post('/districts/', verifyUser, async (req, res) => {
  const {districtName, stateId, cases, cured, active, deaths} = req.body
  try {
    const insertDistQuery = `insert into district (district_name , state_id , cases , cured , active , deaths) values (?,?,?,?,?,?)`
    await db.run(insertDistQuery, [
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    ])
    res.status(200).send('District Successfully Added'); // ✅ exact text
  } catch (e) {
    res.status(500).send({msg: 'Server Error'})
    console.log(e.message)
  }
})
// fith api call
app.get('/districts/:districtId/', verifyUser, async (req, res) => {
  const {districtId} = req.params
  try {
    const getDistrictQuery = `select * from district where district_id = ?`
    const DistObj = await db.get(getDistrictQuery, [districtId])
    if (!DistObj) {
      res.status(404).send({msg: 'Faild to Fetch District'})
      return
    } else {
      res
        .status(200)
        .send({msg: 'Successfully Fetched the District by Id', DistObj})
    }
  } catch (e) {
    res.status(500).send({msg: 'Server Error'})
    console.log(e.message)
  }
})
// sixth api call
app.delete('/districts/:districtId/', verifyUser, async (req, res) => {
  const {districtId} = req.params
  try {
    const deleteDistQuery = `delete from district where district_id = ?`
    await db.run(deleteDistQuery, [districtId])
    res.status(200).send('District Removed'); // ✅ exact text
  } catch (e) {
    res.status(500).send({msg: 'Server Error'})
    console.log(e.message)
  }
})
app.put('/districts/:districtId/', verifyUser, async (req, res) => {
  const {districtId} = req.params
  const {districtName, stateId, status, deaths, cases, cured, active} = req.body
  try {
    const updateDistQuery = `
      UPDATE district
      SET district_name = ?, state_id = ?, cases = ?, cured = ?, active = ?, deaths = ?
      WHERE district_id = ?
    `
    await db.run(updateDistQuery, [
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
      districtId,
    ])
    res.status(200).send('District Details Updated'); // ✅ exact text
  } catch (e) {
    console.error(e.message)
    res.status(500).send({msg: 'Server Error'})
  }
})
// eighth's api call
app.get('/states/:stateId/stats/', verifyUser, async (req, res) => {
  const {stateId} = req.params
  try {
    const totalNoInstateQuery = `
      SELECT 
        SUM(cases) AS totalCases,
        SUM(cured) AS totalCured,
        SUM(active) AS totalActive,
        SUM(deaths) AS totalDeaths
      FROM district
      WHERE state_id = ?
    `
    const TotalNoObj = await db.get(totalNoInstateQuery, [stateId])

    if (!TotalNoObj || TotalNoObj.totalCases === null) {
      res.status(404).send({msg: 'No data found for the given state ID'})
    } else {
      res.status(200).send(TotalNoObj)
    }
  } catch (e) {
    console.error(e.message)
    res.status(500).send({msg: 'Server Error'})
  }
})
modules.export = app;