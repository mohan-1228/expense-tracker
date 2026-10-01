require('dotenv').config();
const generateRecurringExpenses = require('../jobs/generateRecurringExpenses');

generateRecurringExpenses() .then(() => process.exit(0));