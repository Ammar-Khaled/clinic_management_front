import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DoctorService } from '../../services/doctor';
import { Doctor } from '../../models/doctor.model';

@Component({
  selector: 'app-doctors',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './doctors.html',
  styleUrl: './doctors.css',
})
export class DoctorsComponent implements OnInit {
  doctors: Doctor[] = [];
  filteredDoctors: Doctor[] = [];
  loading = true;
  errorMsg = '';
  searchTerm = '';

  // Specialization icons map
  specIcons: Record<string, string> = {
    cardiology: 'cardiology',
    dermatology: 'dermatology',
    neurology: 'neurology',
    pediatrics: 'child_care',
    orthopedics: 'accessibility_new',
    general: 'stethoscope',
  };

  constructor(private doctorService: DoctorService) {}

  ngOnInit(): void {
    this.loadDoctors();
  }

  loadDoctors(): void {
    this.doctorService.getAllDoctors().subscribe({
      next: (res) => {
        this.doctors = res.doctors;
        this.filteredDoctors = res.doctors;
        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'Failed to load doctors.';
        this.loading = false;
      },
    });
  }

  onSearch(event: Event): void {
    const term = (event.target as HTMLInputElement).value.toLowerCase();
    this.searchTerm = term;
    this.filteredDoctors = this.doctors.filter(
      (d) =>
        d.specialization.toLowerCase().includes(term) ||
        d.email.toLowerCase().includes(term)
    );
  }

  getIcon(specialization: string): string {
    const key = specialization.toLowerCase();
    for (const [match, icon] of Object.entries(this.specIcons)) {
      if (key.includes(match)) return icon;
    }
    return 'stethoscope';
  }

  getColor(index: number): string {
    const colors = [
      'bg-blue-100 text-blue-700',
      'bg-emerald-100 text-emerald-700',
      'bg-purple-100 text-purple-700',
      'bg-amber-100 text-amber-700',
      'bg-rose-100 text-rose-700',
      'bg-cyan-100 text-cyan-700',
    ];
    return colors[index % colors.length];
  }
}