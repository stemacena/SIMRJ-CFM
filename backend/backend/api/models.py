from django.db import models

class Museu(models.Model):
    nome_instituicao = models.CharField(max_length=255, verbose_name="Nome da Instituição")
    email = models.EmailField(verbose_name="E-mail Institucional")
    data_cadastro = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome_instituicao