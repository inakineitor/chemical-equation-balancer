'use babel';

import {
  ChemicalEquation,
  ChemicalExpression,
  Molecule
} from './src/index';

import algebra from 'algebra.js';

const unbalancedEquation = {
  reactants: [{
      atoms: [{
          identifier: 'C',
          quantity: 1
        },
        {
          identifier: 'H',
          quantity: 4
        }
      ]
    },
    {
      atoms: [{
        identifier: 'O',
        quantity: 2
      }]
    }
  ],
  products: [{
      atoms: [{
          identifier: 'C',
          quantity: 1
        },
        {
          identifier: 'O',
          quantity: 2
        }
      ]
    },
    {
      atoms: [{
          identifier: 'H',
          quantity: 2
        },
        {
          identifier: 'O',
          quantity: 1
        }
      ]
    }
  ]
}

const unbalancedEquationWithId = {
  reactants: [{
      id: 'a',
      atoms: [{
          identifier: 'C',
          quantity: 1
        },
        {
          identifier: 'H',
          quantity: 4
        }
      ]
    },
    {
      id: 'b',
      atoms: [{
        identifier: 'O',
        quantity: 2
      }]
    }
  ],
  products: [{
      id: 'c',
      atoms: [{
          identifier: 'C',
          quantity: 1
        },
        {
          identifier: 'O',
          quantity: 2
        }
      ]
    },
    {
      id: 'd',
      atoms: [{
          identifier: 'H',
          quantity: 2
        },
        {
          identifier: 'O',
          quantity: 1
        }
      ]
    }
  ]
}

const balancedEquation = {
  reactants: [{
      quantity: 1,
      atoms: [{
          identifier: 'C',
          quantity: 1
        },
        {
          identifier: 'H',
          quantity: 4
        }
      ]
    },
    {
      quantity: 2,
      atoms: [{
        identifier: 'O',
        quantity: 2
      }]
    }
  ],
  products: [{
      quantity: 1,
      atoms: [{
          identifier: 'C',
          quantity: 1
        },
        {
          identifier: 'O',
          quantity: 2
        }
      ]
    },
    {
      quantity: 2,
      atoms: [{
          identifier: 'H',
          quantity: 2
        },
        {
          identifier: 'O',
          quantity: 1
        }
      ]
    }
  ]
}

const equation = new ChemicalEquation('CH4 + O2', 'CO2 + H2O');
const expression = new ChemicalExpression('CH4 + O2');
const molecule = new Molecule('CH4');

// ChemicalEquation

// test('ChemicalEquation._addIdToMolecules()', () => {
//   expect(equation._addIdToMolecules()).toEqual();
// });
//
// test('ChemicalEquation.balance()', () => {
//   expect(equation.balance()).toEqual(['C', 'H', 'O']);
// });
//
// test('ChemicalEquation.getSubEquations()', () => {
//   expect(equation.getSubEquations()).toEqual(['C', 'H', 'O']);
// });

test('ChemicalEquation.getSubstances()', () => {
  expect(equation.getSubstances()).toEqual(['C', 'H', 'O']);
});

test('ChemicalEquation.getAlgebraicEquationForSubstance()', () => {
  expect(equation.getAlgebraicalEquationForSubstance('C')).toEqual(new algebra.parse('a = c'));
});

test('ChemicalEquation.toString()', () => {
  expect(equation.toString()).toEqual('CH4 + O2 ⟶ CO2 + H2O');
});

test('ChemicalEquation.toLaTex()', () => {
  expect(equation.toLaTex()).toEqual('CH_4 + O_2 \\longrightarrow CO_2 + H_2O');
});

// ChemicalExpression

test('ChemicalExpression.getAlgrebraicExpressionForSubstance()', () => {
  expect(equation.reactants._getAlgebraicExpressionForSubstance('C')).toEqual(new algebra.Expression('a'));
});

test('ChemicalExpression.toString()', () => {
  expect(expression.toString()).toEqual('CH4 + O2');
});

test('ChemicalExpression.toLaTex()', () => {
  expect(expression.toLaTex()).toEqual('CH_4 + O_2');
});

// Molecule

test('Molecule.toString()', () => {
  expect(molecule.toString()).toEqual('CH4');
});

test('Molecule.toLaTex()', () => {
  expect(molecule.toLaTex()).toEqual('CH_4');
});
