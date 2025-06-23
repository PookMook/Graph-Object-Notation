interface GonValue {
  [key: string]: any;
}

class Reference {
  private path: string[];

  constructor(path: string[] = []) {
    this.path = path;
  }

  getValue(object: GonValue): any {
    return findPath(object, this.path);
  }

  toJSON(): string {
    return `@${this.path.join(".")}@`;
  }

  toGON(): string {
    return `@${this.path.join(".")}@`;
  }
}

const undefinedPath = {};

const findPath = (current: any, path: string[]): any => {
  try {
    path.forEach((p) => {
      if (current[p] === undefined) {
        throw undefinedPath;
      }
      current = current[p];
    });
    return current;
  } catch (e) {
    if (e !== undefinedPath) {
      throw e;
    }
    return null;
  }
};

export default Reference;
