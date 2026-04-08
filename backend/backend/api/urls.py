from django.urls import path
from . import views

urlpatterns = [
    path('museus/cadastrar/', views.cadastrar_museu, name='cadastrar_museu'),
]