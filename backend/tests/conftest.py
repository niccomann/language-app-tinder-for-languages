from app.database.connection import DatabaseConnection
from app.database.seed import run_seed


DatabaseConnection().create_database_and_tables()
run_seed()
