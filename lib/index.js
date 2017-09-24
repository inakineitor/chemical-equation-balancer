'use strict';
'use babel';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Molecule = exports.ChemicalExpression = exports.ChemicalEquation = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _algebra = require('algebra.js');

var _algebra2 = _interopRequireDefault(_algebra);

var _linearSolve = require('linear-solve');

var _linearSolve2 = _interopRequireDefault(_linearSolve);

var _colors = require('colors');

var _colors2 = _interopRequireDefault(_colors);

var _fraction = require('fraction.js');

var _fraction2 = _interopRequireDefault(_fraction);

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// console.log(util.inspect(this, {depth: null}))

var ChemicalEquation = function () {
  function ChemicalEquation(reactants, products) {
    _classCallCheck(this, ChemicalEquation);

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

  _createClass(ChemicalEquation, [{
    key: '_addIdToMolecules',
    value: function _addIdToMolecules() {
      var idArray = [];
      for (var i = 0; i < 2; i++) {
        var indexOfSide = i == 0 ? 'reactants' : 'products';
        for (var indexOfMolecule in this[indexOfSide].molecules) {
          var addedAsciiValue = void 0;
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
  }, {
    key: 'balance',
    value: function balance() {
      var _this = this;

      var subEquations = this.getSubEquations();

      var rows = [];
      var b = [];
      subEquations.forEach(function (subEquation, i) {
        console.log();
        console.log(String(subEquation.substance + ': ').yellow + subEquation.standardEquation.toString().green);
        console.log(String(subEquation.substance + ': ').yellow + subEquation.isolatedEquation.toString().green);
        console.log(String(subEquation.substance + ': ').yellow + subEquation.isolatedExpression.toString().green);

        var row = [];
        _this.idArray.forEach(function (id) {
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
      console.log('[ ' + String(this.idArray) + ' ]');
      rows.forEach(function (row, i) {
        console.log('[ ' + String(row) + ' ] ' + '[ ' + b[i] + ' ]');
      });

      var result = _linearSolve2.default.solve(rows, b);

      console.log();
      console.log(result);

      var processedResult = [];
      result.forEach(function (item) {
        if (item > 0) processedResult.push(new _fraction2.default(String(item)));
      });

      var isThereNonInteger = _checkArrayForNonInteger(processedResult);

      var newProcessedResult = processedResult;

      var _loop = function _loop() {
        var smallest = void 0;
        newProcessedResult.forEach(function (value) {
          if (smallest !== undefined) {
            if (value.d > 1 && smallest.valueOf() > value.valueOf()) {
              smallest = value;
            }
          } else if (value.d > 1) {
            smallest = value;
          }
        });

        newProcessedResult = newProcessedResult.map(function (value) {
          return new _fraction2.default(value.valueOf() * smallest.d);
        });

        isThereNonInteger = _checkArrayForNonInteger(newProcessedResult);
      };

      while (isThereNonInteger) {
        _loop();
      }

      processedResult = newProcessedResult.map(function (value) {
        return value.valueOf();
      });

      var numberOfReactants = 0;
      var equationWithQuantity = this;

      equationWithQuantity.reactants = this.reactants.molecules.map(function (reactant, i) {
        numberOfReactants = i + 1;
        return {
          quantity: processedResult[i],
          atoms: reactant.atoms
        };
      });

      equationWithQuantity.products = this.products.molecules.map(function (product, i) {
        return {
          quantity: processedResult[numberOfReactants + i],
          atoms: product.atoms
        };
      });

      return {
        subEquations: subEquations,
        matrix: {
          rows: rows,
          b: b
        },
        equation: equationWithQuantity,
        quantities: this.idArray.map(function (identifier, i) {
          return {
            identifier: identifier,
            quantity: processedResult[i]
          };
        })
      };
    }
  }, {
    key: 'getSubEquations',
    value: function getSubEquations() {
      var _this2 = this;

      var substances = this.getSubstances();
      var subEquations = [];

      var aEq = _algebra2.default.parse('a = 1');
      var isolatedAEq = _isolateAlgebraicalEquation(aEq);
      subEquations.push({
        standardEquation: aEq,
        isolatedEquation: isolatedAEq,
        isolatedExpression: _isolateAlgebraicalExpression(isolatedAEq)
      });

      substances.forEach(function (substance) {
        var standardEquation = _this2.getAlgebraicalEquationForSubstance(substance);
        var isolatedEquation = _isolateAlgebraicalEquation(standardEquation);
        var isolatedExpression = _isolateAlgebraicalExpression(isolatedEquation);

        subEquations.push({
          substance: substance,
          standardEquation: standardEquation,
          isolatedEquation: isolatedEquation,
          isolatedExpression: isolatedExpression
        });
      });
      return subEquations;
    }
  }, {
    key: 'getSubstances',
    value: function getSubstances() {
      var substances = [];
      for (var i = 0; i < 2; i++) {
        var index = i == 0 ? 'reactants' : 'products';
        this[index].molecules.forEach(function (molecule) {
          molecule.atoms.forEach(function (atom) {
            if (!substances.includes(atom.identifier)) {
              substances.push(atom.identifier);
            }
          });
        });
      }
      return substances;
    }
  }, {
    key: 'getAlgebraicalEquationForSubstance',
    value: function getAlgebraicalEquationForSubstance(substance) {
      return new _algebra2.default.Equation(this.reactants._getAlgebraicExpressionForSubstance(substance), this.products._getAlgebraicExpressionForSubstance(substance));
    }
  }, {
    key: 'toString',
    value: function toString() {
      return this.reactants.toString() + ' ⟶ ' + this.products.toString();
    }
  }, {
    key: 'toLaTex',
    value: function toLaTex() {
      return this.reactants.toLaTex() + ' \\longrightarrow ' + this.products.toLaTex();
    }
  }]);

  return ChemicalEquation;
}();

var ChemicalExpression = function () {
  function ChemicalExpression(stringOrArrayOfMolecules) {
    _classCallCheck(this, ChemicalExpression);

    if (stringOrArrayOfMolecules.constructor === Array && stringOrArrayOfMolecules[0] instanceof Molecule) {
      this.molecules = stringOrArrayOfMolecules;
    } else if (typeof stringOrArrayOfMolecules == 'string') {
      stringOrArrayOfMolecules = stringOrArrayOfMolecules.replace(/\s/g, '').split('+');
      var molecules = [];

      stringOrArrayOfMolecules.forEach(function (molecule) {
        molecules.push(new Molecule(molecule));
      });

      this.molecules = molecules;
    } else throw new Error('The Expression constructor input must be an array whose values are instances of Molecule or a correctly formatted String');
  }

  _createClass(ChemicalExpression, [{
    key: '_getAlgebraicExpressionForSubstance',
    value: function _getAlgebraicExpressionForSubstance(substance) {
      var expression = new _algebra2.default.Expression();
      this.molecules.forEach(function (molecule) {
        molecule.atoms.forEach(function (atom) {
          if (atom.identifier == substance) {
            expression = expression.add(new _algebra2.default.Expression(molecule.id).multiply(atom.quantity ? atom.quantity : 1));
          }
        });
      });
      return expression;
    }
  }, {
    key: 'toString',
    value: function toString() {
      var first = true;
      var string = '';
      this.molecules.forEach(function (molecule) {
        if (first) {
          string = molecule.toString();
          first = false;
        } else {
          string += ' + ' + molecule.toString();
        }
      });

      return string;
    }
  }, {
    key: 'toLaTex',
    value: function toLaTex() {
      var first = true;
      var string = '';
      this.molecules.forEach(function (molecule) {
        if (first) {
          string = molecule.toLaTex();
          first = false;
        } else {
          string += ' + ' + molecule.toLaTex();
        }
      });

      return string;
    }
  }]);

  return ChemicalExpression;
}();

var Molecule = function () {
  function Molecule(stringOrArrayOfAtoms) {
    _classCallCheck(this, Molecule);

    if (stringOrArrayOfAtoms.constructor === Array) {
      this.atoms = stringOrArrayOfAtoms;
    } else if (typeof stringOrArrayOfAtoms == 'string') {
      var atoms = stringOrArrayOfAtoms.replace(/\s/g, '').split(/(?=[A-Z])/);
      this.atoms = atoms.map(function (atom) {
        var content = atom.replace(/\'/g, '').split(/(\d+)/).filter(Boolean);
        if (content[1]) {
          return {
            identifier: content[0],
            quantity: Number(content[1])
          };
        } else {
          return {
            identifier: content[0]
          };
        }
      });
    } else throw new Error('The Molecule contructor input must be a String or a correctly formatted Array');
  }

  _createClass(Molecule, [{
    key: 'toString',
    value: function toString() {
      var string = '';
      this.atoms.forEach(function (atom) {
        string += String(atom.identifier + (atom.quantity !== undefined ? atom.quantity : ''));
      });
      return string;
    }
  }, {
    key: 'toLaTex',
    value: function toLaTex() {
      var string = '';
      this.atoms.forEach(function (atom) {
        string += String(atom.identifier + (atom.quantity !== undefined ? '_' + atom.quantity : ''));
      });
      return string;
    }
  }]);

  return Molecule;
}();

var _checkArrayForNonInteger = function _checkArrayForNonInteger(array) {
  return array.findIndex(function (fraction) {
    return !Number.isInteger(fraction.valueOf());
  }) > -1;
};

var _getCoefficientForVariableInAlgebraicalExpression = function _getCoefficientForVariableInAlgebraicalExpression(expression, variable) {
  var number = void 0;
  for (var termIndex in expression.terms) {
    if (expression.terms[termIndex].variables[0].variable == variable) {
      number = expression.terms[termIndex].coefficients[0].numer;
      break;
    }
  }

  return number;
};

var _isolateAlgebraicalEquation = function _isolateAlgebraicalEquation(eq) {
  return new _algebra2.default.Equation(eq.lhs.subtract(eq.rhs), 0);
};

var _isolateAlgebraicalExpression = function _isolateAlgebraicalExpression(eq) {
  return eq.lhs;
};

exports.ChemicalEquation = ChemicalEquation;
exports.ChemicalExpression = ChemicalExpression;
exports.Molecule = Molecule;