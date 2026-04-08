from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .serializers import MuseuSerializer

@api_view(['POST'])
def cadastrar_museu(request):
    tradutor = MuseuSerializer(data=request.data)
    if tradutor.is_valid():
        tradutor.save() # Salva no banco de dados (Supabase)
        return Response({"mensagem": "Museu recebido com sucesso!"}, status=status.HTTP_201_CREATED)
    
    # Se faltar algum dado, ele avisa o erro
    return Response(tradutor.errors, status=status.HTTP_400_BAD_REQUEST)