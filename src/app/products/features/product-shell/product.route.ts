import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('../product-list/product-list'),
  },
  {
    path: 'collection/:brand',
    loadComponent: () => import('../product-list/product-list'),
    prerender: false,
  },
  {
    path: ':id',
    loadComponent: () => import('../product-detail/product-detail'),
    prerender: false,
  },
] as Routes;
