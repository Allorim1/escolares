import { Routes } from "@angular/router";

export default [
  {
    path: '',
    loadComponent: () => import('../product-list/product-list'),
  },
  {
    path: ':id',
    loadComponent: () => import('../product-detail/product-detail'),
    // the detail component expects an `id` input
    prerender: false,
  },
] as Routes;