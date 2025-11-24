import logging

from sqlmodel import Session, SQLModel, create_engine, text

from app.core.config import config

log = logging.getLogger(__name__)


class DatabaseConnection:
    """
    Database connection manager.
    
    This class handles the creation of the database engine and session.
    It includes comprehensive logging to track connection issues.
    """
    
    _engine = None
    _initialized = False
    
    def __init__(self):
        if not DatabaseConnection._initialized:
            self._initialize_connection()
            DatabaseConnection._initialized = True
    
    def _initialize_connection(self):
        """Initialize database connection"""
        self.connect_args = {"check_same_thread": False}
        
        log.info("Initializing database connection...")
        log.debug(f"Database URL components:")
        log.debug(f"  - Host: {config.database.host}")
        log.debug(f"  - Port: {config.database.port} (type: {type(config.database.port).__name__})")
        log.debug(f"  - Schema: {config.database.db_schema} (type: {type(config.database.db_schema).__name__})")
        log.debug(f"  - Database: {config.database.database}")
        
        try:
            db_url = config.database.url
            log.debug(f"Database URL constructed successfully")
            
            DatabaseConnection._engine = create_engine(db_url, echo=False)
            log.info("Database engine created successfully")
            
            self._verify_connection()
            log.info("Database connection verified successfully")
            
        except TypeError as e:
            log.error("=" * 60)
            log.error("CRITICAL: Type error during database connection initialization")
            log.error("=" * 60)
            log.error(f"Error: {e}")
            log.error(f"This typically indicates an int+str concatenation error in the database URL")
            log.error(f"Check that all database configuration values are strings:")
            log.error(f"  - port type: {type(config.database.port).__name__} (should be str)")
            log.error(f"  - schema type: {type(config.database.db_schema).__name__} (should be str)")
            log.error("=" * 60)
            raise
        except Exception as e:
            log.error(f"Failed to initialize database connection: {e}")
            raise

    @property
    def session(self) -> Session:
        """Get a new database session"""
        if DatabaseConnection._engine is None:
            self._initialize_connection()
        return Session(DatabaseConnection._engine)

    @property
    def engine(self):
        """Get the database engine"""
        if DatabaseConnection._engine is None:
            self._initialize_connection()
        return DatabaseConnection._engine

    def create_database_and_tables(self):
        """
        Create database tables from SQLModel metadata.
        """
        try:
            log.info("Creating database tables...")
            
            # Import models to register them with SQLModel
            from app.database.models import FlashcardEntity, UserProgressEntity
            
            log.debug(f"Creating tables in schema: {config.database.db_schema}")
            SQLModel.metadata.create_all(self.engine)
            
            log.info("Database tables created successfully")
            
        except TypeError as e:
            log.error("=" * 60)
            log.error("CRITICAL: Type error during table creation")
            log.error("=" * 60)
            log.error(f"Error: {e}")
            log.error(f"This often indicates a type mismatch in:")
            log.error(f"  1. Foreign key definitions")
            log.error(f"  2. Schema configuration")
            log.error(f"  3. Field type annotations")
            log.error(f"Current schema: {config.database.db_schema} (type: {type(config.database.db_schema).__name__})")
            log.error("=" * 60)
            raise
        except Exception as e:
            log.error(f"Failed to create database tables: {e}")
            log.error(f"Error type: {type(e).__name__}")
            raise

    def recreate_schema(self):
        """
        Drop and recreate the database schema from scratch.
        
        WARNING: This will delete ALL data in the schema!
        """
        schema = config.database.db_schema
        
        try:
            log.warning("=" * 60)
            log.warning(f"RECREATING DATABASE SCHEMA: {schema}")
            log.warning("=" * 60)
            
            with self.session as session:
                log.info(f"Dropping schema '{schema}'...")
                session.exec(text(f"DROP SCHEMA IF EXISTS {schema} CASCADE"))
                session.commit()
                log.info(f"✓ Schema '{schema}' dropped")
                
                log.info(f"Creating schema '{schema}'...")
                session.exec(text(f"CREATE SCHEMA {schema}"))
                session.commit()
                log.info(f"✓ Schema '{schema}' created")
            
            log.info("Creating tables from ORM...")
            SQLModel.metadata.create_all(self.engine)
            log.info("✓ Tables created")
            
            with self.session as session:
                result = session.exec(text(f"""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = '{schema}'
                    ORDER BY table_name
                """))
                tables = [row[0] for row in result.fetchall()]
            
            log.info(f"✓ Schema recreated successfully with {len(tables)} tables:")
            for table in tables:
                log.info(f"  • {table}")
            log.warning("=" * 60)
            
        except Exception as e:
            log.error("=" * 60)
            log.error("FAILED TO RECREATE SCHEMA")
            log.error("=" * 60)
            log.error(f"Error: {e}")
            log.error(f"Error type: {type(e).__name__}")
            raise Exception(f"Schema recreation failed: {e}")

    def _verify_connection(self):
        """
        Check if the database connection is available by executing a simple query.
        """
        try:
            log.debug("Testing database connection with SELECT 1 query...")
            
            with self.engine.connect() as connection:
                result = connection.execute(text("SELECT 1"))
                result.fetchone()
                
            log.debug("Database connection test successful")
            
        except Exception as e:
            log.error("=" * 60)
            log.error("DATABASE CONNECTION TEST FAILED")
            log.error("=" * 60)
            log.error(f"Error: {e}")
            log.error(f"Error type: {type(e).__name__}")
            log.error(f"Database URL: postgresql://{config.database.user}:***@{config.database.host}:{config.database.port}/{config.database.database}")
            log.error(f"Schema: {config.database.db_schema}")
            log.error("=" * 60)
            raise Exception(f"Database connection failed: {e}")
