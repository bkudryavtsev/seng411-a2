import * as d3 from 'd3';
import firebase from 'firebase/app';

import 'firebase/database';

firebase.initializeApp({
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID
});

var db = firebase.database();

async function getUserId() {
  try {
    await db.ref('users').push({ timestamp: Date.now() });
    const snapshot = await db.ref('users').get();
    return Object.keys(snapshot.val()).length;
  } catch (e) {
    throw new Error(e);
  }
}

async function getNextTrialIndex() {
  try {
    const snapshot = await db.ref('trials').get();
    console.log(snapshot.exists(), snapshot.val());
    if (snapshot.exists()) {
      const trialNums = Object.keys(snapshot.val()).map(v => parseInt(v));
      return Math.max(...trialNums) + 1;
    } else {
      return 0;
    }
  } catch (e) {
    throw new Error(e);
  }
}

function uploadResults(results) {
  return results.reduce((p, result) => p.then(() => new Promise((resolve, reject) => {
    getNextTrialIndex().then(i => db.ref(`trials/${i}`).set(result).then(res => resolve()));
  })), Promise.resolve());
}

const WIDTH = 400;
const HEIGHT = 400;

const MIN_VALUE = 10;
const MAX_VALUE = 99;
const NUM_REPETITIONS = 5;

const INSTR_BUBBLE = 'Click on the smallest bubble';
const INSTR_NUMBER = 'Click on the smallest number';
const SURVEY_URL = 'https://www.surveymonkey.ca/r/TGPJCW7';

const pad = 5; //padding for grid layout (text and bubble)

const fontSize = 48; // arbitrary choice

// keep a reference of the canvas
const svg = d3.select('#app')
  .append('svg')
  .attr('width', WIDTH)
  .attr('height', HEIGHT);

function createTrials(conditions, numRep, bubbleFirst) {
  const trials = [];

  conditions.forEach(condition => {
    for (let i = 0; i < numRep; i++) {
      trials.push([bubbleFirst ? 'bubble' : 'text', condition]);
    }
  });

  conditions.forEach(condition => {
    for (let i = 0; i < numRep; i++) {
      trials.push([bubbleFirst ? 'text' : 'bubble', condition]);
    }
  });

  return trials;
}

function showLoader(show, text) {
  document.querySelector('.loader').style.display = show ? 'block': 'none';
  document.querySelector('#app').style.display = show ? 'none' : 'block';
  document.querySelector('#info-text').innerHTML = text || 'Loading...';
}

document.querySelector('#start-button').addEventListener('click', startTrials);

function uniqueRandomRange(n, min, max) {
  const nums = new Set();
  while(nums.size !== n) {
    nums.add(min + Math.floor(Math.random() * (max - min)));
  }
  
  return [...nums];
}

async function startTrials() {
  document.querySelector('#start-button').style.display = 'none'; 
  showLoader(true);

  const userId = await getUserId();
  const trials = createTrials([3, 5, 9, 25], NUM_REPETITIONS, userId % 2 === 0);
  let currentTrial = 0;

  showLoader(false, `${trials[0].representation === 'bubble' ? INSTR_BUBBLE : INSTR_NUMBER}`);

  console.log(userId);

  const results = [];
    
  function update(representation, n) {
    const values = uniqueRandomRange(n, MIN_VALUE, MAX_VALUE);

    let start;

    svg.selectAll('g').remove();

    document.querySelector('#info-text').innerHTML = 
      `${representation === 'bubble' ? INSTR_BUBBLE : INSTR_NUMBER}`;

    let numCol, numRow;

    if (n === 3 || n === 5) {
      numCol = 5;
      numRow = 5;
    } else {
      numCol = Math.round(Math.sqrt(n));
      numRow = Math.round(Math.sqrt(n));
    }

    const _w = WIDTH/numCol;
    const _h = HEIGHT/numRow;

    const bubble_min_radius = 1;// arbitrary, could be 0, or something else
    const bubble_max_radius = (_w/2 - pad*2);

    const sign = svg.selectAll('g') // create one group element to display each value, puts it at its position
      .data(values)
      .enter()
      .append('g')
      .attr('transform', (d, i) => {
        switch (n) {
          case 3: {
            const cols = [2, 1, 3];
            const rows = [1, 3, 3];
            return `translate(${(cols[i]*_w + (pad/2)*-1)},${(rows[i]*_h + (pad/2)*-1)})`;
          }
          case 5: {
            const cols = [1, 3, 2, 1, 3];
            const rows = [1, 1, 2, 3, 3];
            return `translate(${(cols[i]*_w + (pad/2)*-1)},${(rows[i]*_h + (pad/2)*-1)})`;
          }
          case 9:
            return `translate(${((i%3)*_w + (pad/2)*-1)},${((Math.floor(i/3))*_h + (pad/2)*-1)})`;
        }

        return `translate(${((i%numCol)*_w + (pad/2)*-1)},${((Math.floor(i/numRow))*_h + (pad/2)*-1)})`;
      })
      .on('click', async (e, d) => {
        if (start) {
          results.push({
            userId,
            timestamp: Date.now(),
            representation: representation,
            numvalues: n,
            values: values.toString(),
            selectedvalue: d,
            correctvalue: d3.min(values),
            duration: Date.now() - start,
            error: Math.abs((d3.min(values) - d) / (d3.max(values) - d3.min(values))),
          });

          const nextTrial = trials[++currentTrial];
          if (nextTrial) {
            svg.selectAll('g').remove();
            document.querySelector('#timeout-bar').classList.add('full');
            setTimeout(() => {
              document.querySelector('#timeout-bar').classList.remove('full');
              update(...nextTrial);
            }, 500);
          } else {
            showLoader(true, 'Uploading your results. Please wait.');
            await uploadResults(results);
            showLoader(false, 'That\'s it!');
            document.querySelector('#info-text').innerHTML = `
              <p>That's it!</p>
              <p>Please copy your USER ID:&nbsp;<input type="text" onClick="this.setSelectionRange(0, this.value.length)" value="${userId}" readonly></p>
              <p>and complete the <a href="${SURVEY_URL}" target="_blank">exit questionnaire</a></p>
            `;
            document.querySelector('#app').style.display = 'none';
            console.log(results);
          }
        }
      }).style('cursor','pointer')//make it a pointer on mouseover

    if (representation === 'bubble') {
      //that's to create a perceptual scaling by mapping square root of value to radius, but other scaling functions could be used
      let circleRadiusScale = d3.scaleLinear()
          .domain([Math.sqrt(MIN_VALUE), Math.sqrt(MAX_VALUE)])
          .range([bubble_min_radius, bubble_max_radius]);
      
      //create an 'invisible' circle of size half the max size of a bubble, simply to make it possible to click the smaller circles easily.
      sign.append('circle')
        .attr('cx', _w/2)
        .attr('cy', _w/2)
        .attr('r', bubble_max_radius/2)
        .style('fill', 'white')

      // then, for each cell we appends a circle
      sign.append('circle')
        .attr('cx', _w/2)
        .attr('cy', _w/2)
        .attr('r', d => circleRadiusScale(Math.sqrt(d)))
        .style('fill','black')
    } else if(representation === 'text') {
      //create an 'invisible' circle of size half the max size of a bubble, simply to make it possible to click the smaller circles easily.
      sign.append('circle')
        .attr('cx', _w/2)
        .attr('cy', _w/2)
        .attr('r', bubble_max_radius/2)
        .style('fill', 'white')
      
      sign.append('text')
        .attr('x', _w/2)
        .attr('y', _w/2)
        .attr('text-anchor','middle')
        .attr('font-size', fontSize+'px')
        .text(d => d)
    }

    start = Date.now();
  }

  update(...trials[currentTrial]);
}
