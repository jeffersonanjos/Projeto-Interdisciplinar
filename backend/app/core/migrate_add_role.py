import logging
from sqlmodel import Session, text
from core.database import engine

logger = logging.getLogger(__name__)


def migrate_add_role_column():
    """
    Adiciona a coluna 'role' à tabela User para usuários existentes.
    Este script deve ser executado UMA VEZ após atualizar o modelo User.
    """
    logger.info("Iniciando migração: adicionando coluna 'role' à tabela User")
    
    with Session(engine) as session:
        try:
            session.exec(text("ALTER TABLE user ADD COLUMN role VARCHAR DEFAULT 'normal'"))
            session.commit()
            logger.info("Coluna 'role' adicionada com sucesso à tabela User")
        except Exception as e:
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                logger.info("Coluna 'role' já existe na tabela User. Nenhuma ação necessária.")
            else:
                logger.error(f"Erro ao adicionar coluna 'role': {e}")
                session.rollback()
                raise
        
        try:
            result = session.exec(text("SELECT COUNT(*) FROM user WHERE role IS NULL")).first()
            if result and result[0] > 0:
                session.exec(text("UPDATE user SET role = 'normal' WHERE role IS NULL"))
                session.commit()
                logger.info(f"Atualizado {result[0]} usuários com role padrão 'normal'")
        except Exception as e:
            logger.error(f"Erro ao atualizar usuários com role padrão: {e}")
            session.rollback()
    
    logger.info("Migração concluída")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    migrate_add_role_column()
