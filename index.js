import * as d3 from 'd3';

// the canvas size
let width = 400;
let height = 400;

//toggle bubble chart or text representation
//const REPRESENTATION = 'text';
const REPRESENTATION = 'bubble';

const MIN_VALUE = 0;
const MAX_VALUE = 99;
const NB_VALUES = 25;

// keep a reference of the canvas
const svg = d3.select('#app')
  .append('svg')
  .attr('width', width)
  .attr('height', height);

let values = d3.range(NB_VALUES).map(d => Math.floor(Math.random() * 100)) // the randomly generated set of values between 0 and 99
console.log(values)

let pad = 5 //padding for grid layout (text and bubble)
let numCol, numRow; // number of columns, number of rows
let bubble_min_radius, bubble_max_radius;
let _w, _h;
  
let font_size;
  
if (NB_VALUES == 25){
  numCol = 5;
  numRow = 5;
  _w = width/numCol
  _h = height/numRow

  bubble_min_radius = 1;// arbitrary, could be 0, or something else
  bubble_max_radius = (_w/2 - pad*2);
  
  font_size = 48// arbitrary choice
}

let sign = svg.selectAll('g') // create one group element to display each value, puts it at its position
  .data(values)
  .enter()
  .append('g')
  .attr('transform', (d, i) => 
    `translate(${((i%numCol)*_w + (pad/2)*-1)},${((Math.floor(i/numRow))*_h + (pad/2)*-1)})`)
  .on('click', d => {
    console.log('clicked: ',d)
  }).style('cursor','pointer')//make it a pointer on mouseover

if (REPRESENTATION === 'bubble') {
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
} else if(REPRESENTATION === 'text'){
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
    .attr('font-size', font_size+'px')
    .text(d => d)
}
