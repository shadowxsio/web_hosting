#!/usr/bin/env python3
"""
Script interactif pour configurer l'accès à l'API Strava.
Il guide l'utilisateur pour obtenir le REFRESH_TOKEN nécessaire à GitHub Actions.
"""

import urllib.parse
import urllib.request
import json
import webbrowser
import http.server
import socketserver
import threading
import sys

# Variables globales pour le serveur local
auth_code = None

class AuthHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        global auth_code
        parsed_path = urllib.parse.urlparse(self.path)
        
        if parsed_path.path == '/exchange_token':
            query_params = urllib.parse.parse_qs(parsed_path.query)
            
            if 'code' in query_params:
                auth_code = query_params['code'][0]
                self.send_response(200)
                self.send_header('Content-type', 'text/html; charset=utf-8')
                self.end_headers()
                self.wfile.write(b"<h1>Authentification reussie !</h1><p>Vous pouvez fermer cette fenetre et retourner dans le terminal.</p>")
            else:
                self.send_response(400)
                self.send_header('Content-type', 'text/html; charset=utf-8')
                self.end_headers()
                self.wfile.write(b"<h1>Erreur</h1><p>Aucun code d'autorisation trouve.</p>")
        else:
            self.send_response(404)
            self.end_headers()

def main():
    print("=" * 60)
    print("👟 CONFIGURATION DE L'API STRAVA POUR RUNNING RECORDS 👟")
    print("=" * 60)
    print("\nÉtape 1 : Créer une application sur Strava")
    print("1. Allez sur https://www.strava.com/settings/api")
    print("2. Remplissez le formulaire (Application Name: Running Records, Category: Visualizer, Website: https://github.com, Authorization Callback Domain: localhost)")
    print("3. Une fois créée, vous verrez votre 'Client ID' et 'Client Secret'.\n")
    
    client_id = input("Entrez votre Client ID Strava : ").strip()
    client_secret = input("Entrez votre Client Secret Strava : ").strip()
    
    if not client_id or not client_secret:
        print("Erreur : Client ID et Client Secret sont obligatoires.")
        sys.exit(1)
        
    print("\nÉtape 2 : Autorisation")
    print("Une page web va s'ouvrir pour vous demander d'autoriser l'application.")
    print("Veuillez cliquer sur 'Autoriser'...\n")
    
    # Démarrer un serveur HTTP local temporaire sur le port 8000
    PORT = 8000
    server = socketserver.TCPServer(("", PORT), AuthHandler)
    server_thread = threading.Thread(target=server.serve_forever)
    server_thread.daemon = True
    server_thread.start()
    
    # Ouvrir le navigateur
    auth_url = f"https://www.strava.com/oauth/authorize?client_id={client_id}&response_type=code&redirect_uri=http://localhost:{PORT}/exchange_token&approval_prompt=force&scope=read,activity:read_all"
    webbrowser.open(auth_url)
    
    # Attendre que l'utilisateur s'authentifie
    import time
    while auth_code is None:
        time.sleep(1)
        
    server.shutdown()
    
    print("\nCode d'autorisation récupéré !")
    print("Étape 3 : Génération du Refresh Token...")
    
    # Échanger le code contre un token
    token_url = "https://www.strava.com/oauth/token"
    data = urllib.parse.urlencode({
        'client_id': client_id,
        'client_secret': client_secret,
        'code': auth_code,
        'grant_type': 'authorization_code'
    }).encode('utf-8')
    
    try:
        req = urllib.request.Request(token_url, data=data)
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            print("\n" + "=" * 60)
            print("🎉 SUCCÈS ! Voici vos secrets à ajouter sur GitHub :")
            print("=" * 60)
            print("Allez sur votre dépôt GitHub > Settings > Secrets and variables > Actions > New repository secret\n")
            print(f"1. Nom : STRAVA_CLIENT_ID")
            print(f"   Valeur : {client_id}")
            print(f"\n2. Nom : STRAVA_CLIENT_SECRET")
            print(f"   Valeur : {client_secret}")
            print(f"\n3. Nom : STRAVA_REFRESH_TOKEN")
            print(f"   Valeur : {result['refresh_token']}")
            print("=" * 60)
            print("\nUne fois ces 3 secrets ajoutés, GitHub Actions pourra récupérer automatiquement le dénivelé !")
            
    except Exception as e:
        print(f"\nErreur lors de la récupération du token : {e}")
        print("Vérifiez que vos Client ID et Client Secret sont corrects.")

if __name__ == "__main__":
    main()
