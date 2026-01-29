from http.server import HTTPServer, SimpleHTTPRequestHandler
import ssl
from pathlib import Path
import argparse

parser = argparse.ArgumentParser(description="A secure HTTP localhost server.")
parser.add_argument("--port", type=int, default=4443, help="The port to serve on. Defaults to 4443.")
parser.add_argument("--certificate-file-path", type=str, required=True, help="The path to the TSL certificate to use.")

args = parser.parse_args()
port = args.port
certificate = args.certificate_file_path

httpd = HTTPServer(("localhost", port), SimpleHTTPRequestHandler)
ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ssl_context.load_cert_chain(certificate)
httpd.socket = ssl_context.wrap_socket(
    httpd.socket,
    server_side=True,
)

print(f"Serving on https://localhost:{port}")
httpd.serve_forever()