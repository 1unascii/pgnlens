from rest_framework import serializers
from .models import Game, Report

class GameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = '__all__'

class GameCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = ['id', 'white_player', 'black_player', 'date', 'result',
                  'termination', 'opening_category','opening_line', 'opening_family']        

class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = '__all__'

class PGNUploadSerializer(serializers.Serializer):
    player_name = serializers.CharField(required=False)
    report_name = serializers.CharField(required=False)
    file = serializers.FileField()