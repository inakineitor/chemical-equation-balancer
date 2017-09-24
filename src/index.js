'use babel';

import algebra from 'algebra.js';
import linear from 'linear-solve';
import colors from 'colors';
import Fraction from 'fraction.js';
import util from 'util';
// console.log(util.inspect(this, {depth: null}))

class ChemicalEquation {
  constructor(reactants, products) {
    if (reactants instanceof ChemicalExpression) {
      this.reactants = reactants;
    } else if (typeof reactants == 'string') {
      this.reactants = new ChemicalExpression(reactants);
    } else throw new Error('The reactant must be an instance of ChemicalExpression or a correctly formatted string.');

    if (products instanceof ChemicalExpression) {
      this.products = products;
    } else if (typeof reactants == 'string') {
      this.products = new ChemicalExpression(products);
    } else throw new Error('The reactant must be an instance of ChemicalExpression or a correctly formatted String.');

    this._addIdToMolecules();
  }

  _addIdToMolecules() {
    let idArray = [];
    for (let i = 0; i < 2; i++) {
      let indexOfSide = i == 0 ? 'reactants' : 'products';
      for (let indexOfMolecule in this[indexOfSide].molecules) {
        let addedAsciiValue;
        if (indexOfSide == 'reactants') {
          addedAsciiValue = indexOfMolecule;
        } else {
          addedAsciiValue = Number(this.reactants.molecules.length) + Number(indexOfMolecule);
        }
        this[indexOfSide].molecules[indexOfMolecule].id = String.fromCharCode(97 + Number(addedAsciiValue));
        idArray.push(String.fromCharCode(97 + Number(addedAsciiValue)));
      }
    }

    this.idArray = idArray;
  }

  balance() {
    let subEquations = this.getSubEquations();

    let rows = [];
    let b = [];
    subEquations.forEach((subEquation, i) => {
      console.log();
      console.log(String(subEquation.substance + ': ').yellow + subEquation.standardEquation.toString().green);
      console.log(String(subEquation.substance + ': ').yellow + subEquation.isolatedEquation.toString().green);
      console.log(String(subEquation.substance + ': ').yellow + subEquation.isolatedExpression.toString().green);

      let row = [];
      this.idArray.forEach((id) => {
        if (!subEquation.isolatedExpression._hasVariable(id)) {
          row.push(0);
        } else {
          row.push(_getCoefficientForVariableInAlgebraicalExpression(subEquation.isolatedExpression, id));
        }
      });
      rows.push(row);

      b.push(i == 0 ? 1 : 0);
    });

    console.log();
    console.log('[ ' + String(this.idArray) + ' ]')
    rows.forEach((row, i) => {
      console.log('[ ' + String(row) + ' ] ' + '[ ' + b[i] + ' ]')
    });

    let result = linear.solve(rows, b);

    console.log();
    console.log(result);

    let processedResult = [];
    result.forEach((item) => {
      if (item > 0) processedResult.push(new Fraction(String(item)));
    });

    let isThereNonInteger = _checkArrayForNonInteger(processedResult);

    let newProcessedResult = processedResult;

    while (isThereNonInteger) {
      let smallest;
      newProcessedResult.forEach((value) => {
        if (smallest !== undefined) {
          if (value.d > 1 && smallest.valueOf() > value.valueOf()) {
            smallest = value;
          }
        } else if (value.d > 1) {
          smallest = value;
        }
      });

      newProcessedResult = newProcessedResult.map((value) => {
        return new Fraction(value.valueOf() * smallest.d);
      });

      isThereNonInteger = _checkArrayForNonInteger(newProcessedResult);
    }

    processedResult = newProcessedResult.map((value) => {
      return value.valueOf();
    });

    let numberOfReactants = 0;
    let equationWithQuantity = this;

    equationWithQuantity.reactants = this.reactants.molecules.map((reactant, i) => {
      numberOfReactants = i + 1;
      return {
        quantity: processedResult[i],
        atoms: reactant.atoms
      }
    });

    equationWithQuantity.products = this.products.molecules.map((product, i) => {
      return {
        quantity: processedResult[numberOfReactants + i],
        atoms: product.atoms
      }
    });

    return {
      subEquations: subEquations,
      matrix: {
        rows: rows,
        b: b
      },
      equation: equationWithQuantity,
      quantities: this.idArray.map((identifier, i) => {
        return {
          identifier: identifier,
          quantity: processedResult[i]
        }
      })
    }
  }

  getSubEquations() {
    let substances = this.getSubstances();
    let subEquations = [];

    let aEq = algebra.parse('a = 1');
    let isolatedAEq = _isolateAlgebraicalEquation(aEq);
    subEquations.push({
      standardEquation: aEq,
      isolatedEquation: isolatedAEq,
      isolatedExpression: _isolateAlgebraicalExpression(isolatedAEq)
    });

    substances.forEach((substance) => {
      let standardEquation = this.getAlgebraicalEquationForSubstance(substance);
      let isolatedEquation = _isolateAlgebraicalEquation(standardEquation);
      let isolatedExpression = _isolateAlgebraicalExpression(isolatedEquation);

      subEquations.push({
        substance: substance,
        standardEquation: standardEquation,
        isolatedEquation: isolatedEquation,
        isolatedExpression: isolatedExpression
      });
    });
    return subEquations;
  }

  getSubstances() {
    let substances = [];
    for (let i = 0; i < 2; i++) {
      let index = i == 0 ? 'reactants' : 'products';
      this[index].molecules.forEach((molecule) => {
        molecule.atoms.forEach((atom) => {
          if (!substances.includes(atom.identifier)) {
            substances.push(atom.identifier);
          }
        });
      });
    }
    return substances;
  }

  getAlgebraicalEquationForSubstance(substance) {
    return new algebra.Equation(this.reactants._getAlgebraicExpressionForSubstance(substance), this.products._getAlgebraicExpressionForSubstance(substance));
  }

  toString() {
    return this.reactants.toString() + ' ⟶ ' + this.products.toString();
  }

  toLaTex() {
    return this.reactants.toLaTex() + ' \\longrightarrow ' + this.products.toLaTex();
  }
}

class ChemicalExpression {
  constructor(stringOrArrayOfMolecules) {
    if (stringOrArrayOfMolecules.constructor === Array && stringOrArrayOfMolecules[0] instanceof Molecule) {
      this.molecules = stringOrArrayOfMolecules
    } else if (typeof stringOrArrayOfMolecules == 'string') {
      stringOrArrayOfMolecules = stringOrArrayOfMolecules.replace(/\s/g, '').split('+');
      let molecules = [];

      stringOrArrayOfMolecules.forEach((molecule) => {
        molecules.push(new Molecule(molecule));
      });

      this.molecules = molecules;
    } else throw new Error('The Expression constructor input must be an array whose values are instances of Molecule or a correctly formatted String');
  }

  _getAlgebraicExpressionForSubstance(substance) {
    let expression = new algebra.Expression();
    this.molecules.forEach((molecule) => {
      molecule.atoms.forEach((atom) => {
        if (atom.identifier == substance) {
          expression = expression.add(new algebra.Expression(molecule.id).multiply(atom.quantity ? atom.quantity : 1));
        }
      });
    });
    return expression;
  }

  toString() {
    let first = true;
    let string = '';
    this.molecules.forEach((molecule) => {
      if(first) {
        string = molecule.toString();
        first = false;
      } else {
        string += ' + ' + molecule.toString();
      }
    });

    return string;
  }

  toLaTex() {
    let first = true;
    let string = '';
    this.molecules.forEach((molecule) => {
      if(first) {
        string = molecule.toLaTex();
        first = false;
      } else {
        string += ' + ' + molecule.toLaTex();
      }
    });

    return string;
  }
}

class Molecule {
  constructor(stringOrArrayOfAtoms)  {
    if (stringOrArrayOfAtoms.constructor === Array) {
      this.atoms = stringOrArrayOfAtoms
    } else if (typeof stringOrArrayOfAtoms == 'string') {
      let atoms = stringOrArrayOfAtoms.replace(/\s/g, '').split(/(?=[A-Z])/);
      this.atoms = atoms.map((atom) => {
        let content = atom.replace(/\'/g, '').split(/(\d+)/).filter(Boolean);
        if (content[1]) {
          return {
            identifier: content[0],
            quantity: Number(content[1])
          }
        } else {
          return {
            identifier: content[0]
          }
        }
      });
    } else throw new Error('The Molecule contructor input must be a String or a correctly formatted Array')
  }

  toString() {
    let string = '';
    this.atoms.forEach((atom) => {
      string += String(atom.identifier + (atom.quantity !== undefined ? atom.quantity : ''));
    });
    return string;
  }

  toLaTex() {
    let string = '';
    this.atoms.forEach((atom) => {
      string += String(atom.identifier + (atom.quantity !== undefined ? '_' + atom.quantity : ''));
    });
    return string;
  }
}

const _checkArrayForNonInteger = (array) => {
  return array.findIndex((fraction) => {
    return !Number.isInteger(fraction.valueOf());
  }) > -1;
}

const _getCoefficientForVariableInAlgebraicalExpression = (expression, variable) => {
  let number;
  for (let termIndex in expression.terms) {
    if (expression.terms[termIndex].variables[0].variable == variable) {
      number = expression.terms[termIndex].coefficients[0].numer;
      break;
    }
  }

  return number;
}

const _isolateAlgebraicalEquation = (eq) => {
  return new algebra.Equation(eq.lhs.subtract(eq.rhs), 0);
}

const _isolateAlgebraicalExpression = (eq) => {
  return eq.lhs;
}

export {
  ChemicalEquation,
  ChemicalExpression,
  Molecule
}
