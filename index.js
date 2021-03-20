import * as d3 from 'd3';

const WIDTH = 400;
const HEIGHT = 400;

const MIN_VALUE = 0;
const MAX_VALUE = 99;
const NUM_REPETITIONS = 5;

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const userId = urlParams.has('uid') ? +urlParams.get('uid') : null;

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

const trials = createTrials([3, 5, 9, 25], NUM_REPETITIONS, userId % 2 === 0);
let currentTrial = 0;

const results = [];
  
function update(representation, n) {
  const values = d3.range(n).map(d => MIN_VALUE + Math.floor(Math.random() * (MAX_VALUE - MIN_VALUE)));

  let start;

  svg.selectAll('g').remove();

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
    .on('click', (e, d) => {
      if (start) {
        results.push({
          userId,
          trial: currentTrial,
          representation: representation,
          duration: Date.now() - start,
          error: Math.abs((d - d3.min(values)) / d3.max(values) - d3.min(values)),
        });

        const nextTrial = trials[++currentTrial];
        if (nextTrial) {
          update(...nextTrial);
        } else {
          alert('All trials complete!');
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
