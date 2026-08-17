import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';

/**
 * Single entry point for the static JSON fixtures under `assets/data/`.
 * Responses are cached per file so navigating between pages does not refetch.
 */
@Injectable({ providedIn: 'root' })
export class JsonDataService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, Observable<unknown>>();

  load<T>(file: string): Observable<T> {
    const cached = this.cache.get(file);
    if (cached) {
      return cached as Observable<T>;
    }

    const request = this.http
      .get<T>(`assets/data/${file}`)
      .pipe(shareReplay({ bufferSize: 1, refCount: false }));

    this.cache.set(file, request);
    return request;
  }
}
