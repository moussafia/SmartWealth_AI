import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatRequest, ChatResponse } from '../models/advisor.model';

@Injectable({ providedIn: 'root' })
export class AdvisorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/advisor`;

  /** Conversation avec mémoire (Spring AI). */
  chat(body: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.baseUrl}/chat`, body);
  }

  /** Vide la mémoire de conversation de l'utilisateur. */
  clearMemory(): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/chat/memory`);
  }

  /** Agent de raisonnement (LangChain4j : outils + RAG). */
  agent(body: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.baseUrl}/agent`, body);
  }

  /** Recherche dans la base de connaissances (RAG seul). */
  knowledge(body: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.baseUrl}/knowledge`, body);
  }
}
