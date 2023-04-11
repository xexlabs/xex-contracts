'use strict'

let offset = 0;
function calc(chain, amount){
    let from = offset+1;
    let to = offset + amount;
    console.log(`${chain}: ${from}-${to}`)
    offset += amount;
}

calc('eth    ', 2450)
calc('polygon', 2000)
calc('bnb    ', 1500)
calc('avax   ', 1500)
calc('ftm    ', 2500)

console.log(`total: ${offset}`)
