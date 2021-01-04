import { expect } from 'chai';
import { RecursiveObj } from './recursive-obj.js';

describe('flatten', () => {
  it('should flatten a simple object with no recursion', () => {
    const a = {};
    const result = RecursiveObj.flatten(a);
    expect(result.obj).to.eql(a);
    expect(result.references).to.eql({});
  });
  it('should flatten a 1-level recursive object', () => {
    const a = {};
    const b = {};
    a.b = b;
    b.a = a;

    const result = RecursiveObj.flatten(a);
    expect(result.obj.b).to.have.own.property('a');
    expect(result.obj.b.a).to.have.own.property('b');
    expect(result.obj.b.a.b).to.be.a('string');
    expect(result.references).to.include.all.keys([result.obj.b.a.b]);
  });
  it('should flatten an array of recursive objects', () => {
    const a = {};
    const b = {};
    a.b = b;
    b.a = a;

    const result = RecursiveObj.flatten([a, b]);
    expect(result.obj[0].b).to.have.own.property('a');
    expect(result.obj[0].b.a).to.be.a('string');
    expect(result.references).to.include.all.keys([
      result.obj[0].b.a,
      result.obj[1],
    ]);
  });
});

describe('inflate', () => {
  it('should inflate a simple object with no recursion', () => {
    const a = {};
    const result = RecursiveObj.inflate(a, {});
    expect(result).to.eql(a);
  });
  it('should inflate a 1-level recursive object', () => {
    const a = { b: { a: 'ref:123' } };
    const references = { 'ref:123': a };

    const result = RecursiveObj.inflate(a, references);
    expect(result.b).to.have.own.property('a');
    expect(result.b.a).to.have.own.property('b');
    expect(result.b.a.b).to.have.own.property('a');
  });
  it('should inflate an array of recursive objects', () => {
    const a = { b: 'ref:456' };
    const b = { a: 'ref:123' };
    const references = { 'ref:123': a, 'ref:456': b };

    const result = RecursiveObj.inflate([a, b], references);
    expect(result[0].b).to.have.own.property('a');
    expect(result[0].b.a).to.have.own.property('b');
  });
});
describe('stringify', () => {
  it('should stringify a recursive object', () => {
    const a = {};
    const b = {};
    a.b = b;
    b.a = a;

    const result = RecursiveObj.stringify(a);
    expect(result).to.be.a('string');
  });
  it('should emit string that can be parsed', () => {
    const a = {};
    const b = {};
    a.b = b;
    b.a = a;

    const result = RecursiveObj.parse(RecursiveObj.stringify(a));
    expect(result.b).to.have.own.property('a');
    expect(result.b.a).to.have.own.property('b');
  });
});
