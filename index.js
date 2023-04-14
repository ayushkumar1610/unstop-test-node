const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect('mongodb+srv://team5carpool:mongodbpassword@cluster0.6g6cmig.mongodb.net/?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });

const coachSchema = new mongoose.Schema({
  coachId: Number,
  seats: [[Number]],
  availableSeats: [Number]
});

const Coach = mongoose.model('Coach', coachSchema);

// API to book seats in a coach
app.post('/bookSeats', async (req, res) => {
  const { n } = req.body;
  if (n > 7) {
    res.status(400).send('Cannot book more than 7 seats at a time');
    return;
  }

  let coach = await Coach.findOne({coachId:1}).lean();
  let firstFlg = 0;
  if (!coach) {
    firstFlg = 1;
    coach = new Coach({
      coachId: 1,
      seats: Array(11).fill().map(() => Array(7).fill(0)),
      availableSeats: Array(11).fill(7)
    });
    coach.seats[10].fill(-2, 3);
    coach.availableSeats[10] = 3;
  }

  for (let i = 0; i < 11; i++) {
    for (let j = 0; j < 7; j++) {
      if (coach.seats[i][j] === 1) {
        coach.seats[i][j] = -1;
      }
    }
  }

  let booked = false;
  for (let i = 0; i < 11 && !booked; i++) {
    if (coach.availableSeats[i] >= n) {
      for (let j = 0; j < 7 && !booked; j++) {
        if (coach.seats[i][j] === 0) {
          let k = j;
          while (k < 7 && coach.seats[i][k] === 0 && k - j + 1 <= n) k++;
          if (k - j === n) {
            for (let l = j; l < k; l++) coach.seats[i][l] = 1;
            coach.availableSeats[i] -= n;
            booked = true;
          }
        }
      }
    }
  }

  if (!booked) {
    let emptySeats = [];
    for (let i = 0; i < 11; i++) {
      for (let j = 0; j < 7; j++) {
        if (coach.seats[i][j] === 0) emptySeats.push([i, j]);
      }
    }

    let minDistance = Infinity;
    let bestCombination = null;
    let combinations = getCombinations(emptySeats, n);
    for (let combination of combinations) {
      let distance = getDistance(combination);
      if (distance < minDistance) {
        minDistance = distance;
        bestCombination = combination;
      }
    }

    if (bestCombination) {
      for (let seat of bestCombination) {
        coach.seats[seat[0]][seat[1]] = 1;
        coach.availableSeats[seat[0]]--;
      }
    }
  }

  if(firstFlg===1){
    await coach.save();
  }
  else {
    await Coach.updateOne({coachId:1}, coach).then((result) => {
      console.log('Update result:', result);
    })
    .catch((err) => {
      console.log('Error updating document:', err);
    });
  }

  res.send({
    message: `Booked ${n} seats`,
    seats: coach.seats
  });
});

// API to get seat status
app.get('/seatStatus', async (req, res) => {
  let coach = await Coach.findOne();
  
  res.send({
    seats: coach ? coach.seats : []
  });
});

app.delete('/delete', async (req, res) => {
  let coach = await Coach.findOne({coachId:1}).lean();
  if(!coach) return;
  for (let i = 0; i < 11; i++) {
    for (let j = 0; j < 7; j++) {
      coach.seats[i][j] = 0;
    }
  }
  coach.seats[10].fill(-2, 3);
  coach.availableSeats = Array(11).fill(7);
  coach.availableSeats[10] = 3;
  
  await Coach.updateOne({coachId:1}, coach);
  res.send({
    seats: coach ? coach.seats : []
  });
});

// starting server
app.listen(3000, () => console.log('Server listening on port 3000'));

// utility functions
function getCombinations(arr, n) {
  if (n === 0) return [[]];
  let result = [];
  for (let i = 0; i <= arr.length - n; i++) {
    let rest = getCombinations(arr.slice(i + 1), n - 1);
    for (let combination of rest) result.push([arr[i], ...combination]);
  }
  return result;
}

function getDistance(seats) {
  let distance = 0;
  for (let i = 0; i < seats.length; i++) {
    for (let j = i + 1; j < seats.length; j++) {
      distance += Math.abs(seats[i][0] - seats[j][0]) + Math.abs(seats[i][1] - seats[j][1]);
    }
  }
  return distance;
}