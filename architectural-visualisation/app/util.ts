export function arr<Type>(iterable: Iterable<Type> | ArrayLike<Type>) {
  return Array.from(iterable);
}
