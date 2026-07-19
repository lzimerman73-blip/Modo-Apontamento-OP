// declarations.d.ts

// Declaração para que o TypeScript reconheça os módulos de imagem
declare module "*.png" {
  const content: any;
  export default content;
}

declare module "*.jpg" {
  const content: any;
  export default content;
}

declare module "*.svg" {
  const content: any;
  export default content;
}
