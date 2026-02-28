import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-panel',
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  templateUrl: './panel.html',
  styleUrls: ['./panel.css'],
})
export default class Panel {}
