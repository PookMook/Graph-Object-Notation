import Reference from "./reference";

type GonValue = any;

const immutableMe = (object: GonValue): GonValue => {
  let immutableObject: GonValue;
  if (object instanceof Array) {
    immutableObject = [...object];
  } else if (object instanceof Object && object !== null) {
    immutableObject = { ...object };
  }
  return immutableObject || object;
};

//Recusive call of findRef over our object,
const reference = (
  base: GonValue,
  findRef: (obj: GonValue) => Reference,
  nested: boolean = false
): GonValue => {
  let deeperRef: GonValue[] = [];

  // TODO Make everything immutable, if nested, do not call immutableMe(taken care in the parent array/object recursion)
  let object: GonValue;
  if (nested === true) {
    object = base;
  } else {
    object = immutableMe(base);
  }

  if (object instanceof Array) {
    for (let i = 0; i < object.length; i++) {
      //Don't go recursive for primitives
      if (
        typeof object[i] === "object" &&
        object[i] !== null &&
        !(object[i] instanceof Reference) &&
        !(object[i] instanceof Date)
      ) {
        //Go deeper
        object[i] = immutableMe(object[i]);
        deeperRef.push(object[i]);
        object[i] = findRef(object[i]);
      }
    }
  } else if (object instanceof Object) {
    Object.keys(object).forEach(function (key) {
      if (
        object[key] &&
        typeof object[key] === "object" &&
        !(object[key] instanceof Reference) &&
        !(object[key] instanceof Date)
      ) {
        //Go deeper
        object[key] = immutableMe(object[key]);
        deeperRef.push(object[key]);
        object[key] = findRef(object[key]);
      }
    });
  }
  for (let i = 0; i < deeperRef.length; i++) {
    reference(deeperRef[i], findRef, true);
  }
  return object;
};

export default reference;
