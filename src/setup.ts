import Reference from "./reference";

interface SetupOptions {
  references?: { [key: string]: any };
  path?: string[];
}

type GonValue = any;

const setup = (options: SetupOptions) => {
  const { references = {}, path = ["references"] } = options;

  //Import refs
  let knownObjects = new Map<any, string>();
  const refs: { [key: string]: any } = { ...references };

  const keys = Object.keys(refs);
  keys.forEach((k) => {
    knownObjects.set(refs[k], k);
  });

  const usedObjects = new Map<any, string>();

  //Create functionnal generator
  const generator = (start: number = 61440) => {
    let i = start;
    return (): string => {
      i++;
      return `0x${i.toString(16)}`;
    };
  };
  const generate = generator(61440);

  //Type of expected return
  return (type: string = "object") => {
    if (type === "map") {
      return usedObjects;
    } else if (type === "references") {
      //Generate from usedObjects
      const usedRefs: { [key: string]: any } = {};
      for (let [value, key] of usedObjects) {
        usedRefs[key] = value;
      }
      return usedRefs;
    } else if (type === "allReferences") {
      return refs;
    } else {
      return (object: any): Reference => {
        let address: string;
        if (usedObjects.has(object)) {
          address = usedObjects.get(object)!;
        } else {
          //Check if object is known
          if (knownObjects.has(object)) {
            address = knownObjects.get(object)!;
          } else {
            //Ensure uniqueness
            //maybe this should be in the generator function
            do {
              address = generate();
            } while (refs[address] !== undefined);
          }
          //build the refs
          refs[address] = object;
          usedObjects.set(object, address);
        }
        return new Reference([...path, address]);
      };
    }
  };
};

export default setup;
