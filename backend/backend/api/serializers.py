from rest_framework import serializers
from .models import Museu

class MuseuSerializer(serializers.ModelSerializer):
    class Meta:
        model = Museu
        fields = '__all__'