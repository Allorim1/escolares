import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";

@Injectable({
    providedIn: 'root'
})
export class BaseHttpService {
    http = inject(HttpClient);
    apiUrl = 'https://fakestoreapi.com';
}