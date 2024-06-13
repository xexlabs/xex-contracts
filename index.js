const express = require('express')
const app = express()

// Set EJS as the view engine
app.set('view engine', 'ejs')

// Define a route to render the EJS template
app.get('/', (req, res) => {
	res.render('index', { title: 'My EJS Template' })
})

// Start the server
app.listen(3000, () => {
	console.log('Server is running on port 3000')
})
